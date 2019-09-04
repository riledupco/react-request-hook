import createClient from './createClient';
import nock from 'nock';

nock.disableNetConnect();

describe('createClient', () => {
  it('intializes', () => {
    const client = createClient('https://example.com/foo');
    expect(client.axiosInstance.defaults.baseURL).toBe('https://example.com/foo');
  });

  it('intializes with browser url when no baseUrl is passed', () => {
    const client = createClient();
    expect(client.axiosInstance.defaults.baseURL).toBe('http://localhost');
  });

  it('intializes with browser url and prefix', () => {
    const client = createClient('/api/v2');
    expect(client.axiosInstance.defaults.baseURL).toBe('http://localhost/api/v2');
  });

  it('intializes with browser url and prefix with no leading /', () => {
    const client = createClient('api/v2');
    expect(client.axiosInstance.defaults.baseURL).toBe('http://localhost/api/v2');
  });

  describe('getUri()', () => {
    it('return URI for root path', () => {
      const client = createClient('https://foo.com');
      expect(client.getUri('/')).toEqual('https://foo.com/');
    });

    it('return URI for path', () => {
      const client = createClient('https://foo.com');
      expect(client.getUri('/bar')).toEqual('https://foo.com/bar');
    });

    it('return URI without leading slash', () => {
      const client = createClient('https://foo.com');
      expect(client.getUri('bar')).toEqual('https://foo.com/bar');
    });

    it('return URI with params', () => {
      const client = createClient('https://foo.com');
      const uri = client.getUri('bar', { params: { baz: 'foobar' } });

      expect(uri).toEqual('https://foo.com/bar?baz=foobar');
    });

    it('return base URL for no path', () => {
      const client = createClient('https://foo.com');
      expect(client.getUri()).toEqual('https://foo.com/');
    });
  });

  describe('get()', () => {
    it('createdClient get creates full url from relative endpoint', async () => {
      nock('https://example.com:443')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .get('/api/v2/foo')
        .reply(200);

      const client = createClient('https://example.com/api/v2');
      const response = await client.get('foo');

      expect(response.config.url).toEqual('https://example.com/api/v2/foo');
    });

    it('does not double leading /', async () => {
      nock('https://example.com:443')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .get('/api/v2/foo')
        .reply(200, { url: 'https://example.com/api/v2/foo' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.get('/foo');

      expect(response.config.url).toEqual('https://example.com/api/v2/foo');
    });

    it('does not modify full urls', async () => {
      const gitHubScope = nock('https://github.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .get('/users')
        .reply(200, { url: 'https://github.com/users' });

      const exampleScope = nock('https://example.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .get('/api/v2/users')
        .reply(404, { url: 'https://exmaple.com/api/v2/users' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.get('https://github.com/users');

      expect(gitHubScope.isDone()).toBe(true);
      expect(exampleScope.isDone()).toBe(false);
      expect(response.ok).toBe(true);
      expect(response.status).toEqual(200);
      expect(response.data).toEqual({ url: 'https://github.com/users' });
    });

    it('rejects when when an error occurs', async () => {
      nock('https://example.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .get('/api/v2/404')
        .reply(404, { message: 'Not Found' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.get('/404');

      expect(response.ok).toBe(false);
      expect(response.data).toEqual({ message: 'Not Found' });
      expect(response.status).toEqual(404);
      expect(response.statusText).toEqual('Not Found');
    });
  });

  describe('put()', () => {
    it('createdClient put creates full url from relative endpoint', async () => {
      nock('https://example.com:443')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .put('/api/v2/foo', { foo: 'bar' })
        .reply(200);

      const client = createClient('https://example.com/api/v2');
      const response = await client.put('foo', { foo: 'bar' });

      expect(response.config.url).toEqual('https://example.com/api/v2/foo');
    });

    it('does not double leading /', async () => {
      nock('https://example.com:443')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .put('/api/v2/foo', { foo: 'bar' })
        .reply(200, { url: 'https://example.com/api/v2/foo' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.put('/foo', { foo: 'bar' });

      expect(response.config.url).toEqual('https://example.com/api/v2/foo');
    });

    it('does not modify full urls', async () => {
      const gitHubScope = nock('https://github.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .put('/users', { foo: 'bar' })
        .reply(200, { url: 'https://github.com/users' });

      const exampleScope = nock('https://example.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .put('/api/v2/users', { foo: 'bar' })
        .reply(404, { url: 'https://exmaple.com/api/v2/users' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.put('https://github.com/users', { foo: 'bar' });

      expect(gitHubScope.isDone()).toBe(true);
      expect(exampleScope.isDone()).toBe(false);
      expect(response.ok).toBe(true);
      expect(response.status).toEqual(200);
      expect(response.data).toEqual({ url: 'https://github.com/users' });
    });

    it('rejects when when an error occurs', async () => {
      nock('https://example.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .put('/api/v2/404', { foo: 'bar' })
        .reply(404, { message: 'Not Found' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.put('/404', { foo: 'bar' });

      expect(response.ok).toBe(false);
      expect(response.data).toEqual({ message: 'Not Found' });
      expect(response.status).toEqual(404);
      expect(response.statusText).toEqual('Not Found');
    });
  });

  describe('post()', () => {
    it('createdClient post creates full url from relative endpoint', async () => {
      nock('https://example.com:443')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .post('/api/v2/foo', { foo: 'bar' })
        .reply(200);

      const client = createClient('https://example.com/api/v2');
      const response = await client.post('foo', { foo: 'bar' });

      expect(response.config.url).toEqual('https://example.com/api/v2/foo');
    });

    it('does not double leading /', async () => {
      nock('https://example.com:443')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .post('/api/v2/foo', { foo: 'bar' })
        .reply(200, { url: 'https://example.com/api/v2/foo' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.post('/foo', { foo: 'bar' });

      expect(response.config.url).toEqual('https://example.com/api/v2/foo');
    });

    it('does not modify full urls', async () => {
      const gitHubScope = nock('https://github.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .post('/users', { foo: 'bar' })
        .reply(200, { url: 'https://github.com/users' });

      const exampleScope = nock('https://example.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .post('/api/v2/users', { foo: 'bar' })
        .reply(404, { url: 'https://exmaple.com/api/v2/users' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.post('https://github.com/users', { foo: 'bar' });

      expect(gitHubScope.isDone()).toBe(true);
      expect(exampleScope.isDone()).toBe(false);
      expect(response.ok).toBe(true);
      expect(response.status).toEqual(200);
      expect(response.data).toEqual({ url: 'https://github.com/users' });
    });

    it('rejects when when an error occurs', async () => {
      nock('https://example.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .post('/api/v2/404', { foo: 'bar' })
        .reply(404, { message: 'Not Found' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.post('/404', { foo: 'bar' });

      expect(response.ok).toBe(false);
      expect(response.data).toEqual({ message: 'Not Found' });
      expect(response.status).toEqual(404);
      expect(response.statusText).toEqual('Not Found');
    });
  });

  describe('postMultipart()', () => {
    it('createdClient postMultipart creates full url from relative endpoint', async () => {
      nock('https://example.com:443')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .post('/api/v2/foo')
        .reply(200);

      const client = createClient('https://example.com/api/v2');
      const response = await client.postMultipart('foo', { foo: 'bar' });

      expect(response.config.url).toEqual('https://example.com/api/v2/foo');
    });

    it('does not double leading /', async () => {
      nock('https://example.com:443')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .post('/api/v2/foo')
        .reply(200, { url: 'https://example.com/api/v2/foo' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.postMultipart('/foo', { foo: 'bar' });

      expect(response.config.url).toEqual('https://example.com/api/v2/foo');
    });

    it('does not modify full urls', async () => {
      const gitHubScope = nock('https://github.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .post('/users')
        .reply(200, { url: 'https://github.com/users' });

      const exampleScope = nock('https://example.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .post('/api/v2/users')
        .reply(404, { url: 'https://exmaple.com/api/v2/users' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.postMultipart('https://github.com/users', { foo: 'bar' });

      expect(gitHubScope.isDone()).toBe(true);
      expect(exampleScope.isDone()).toBe(false);
      expect(response.ok).toBe(true);
      expect(response.status).toEqual(200);
      expect(response.data).toEqual({ url: 'https://github.com/users' });
    });

    it('rejects when when an error occurs', async () => {
      nock('https://example.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .post('/api/v2/404')
        .reply(404, { message: 'Not Found' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.postMultipart('/404', { foo: 'bar' });

      expect(response.ok).toBe(false);
      expect(response.data).toEqual({ message: 'Not Found' });
      expect(response.status).toEqual(404);
      expect(response.statusText).toEqual('Not Found');
    });
  });

  describe('put()', () => {
    it('createdClient put creates full url from relative endpoint', async () => {
      nock('https://example.com:443')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .put('/api/v2/foo', { foo: 'bar' })
        .reply(200);

      const client = createClient('https://example.com/api/v2');
      const response = await client.put('foo', { foo: 'bar' });

      expect(response.config.url).toEqual('https://example.com/api/v2/foo');
    });

    it('does not double leading /', async () => {
      nock('https://example.com:443')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .put('/api/v2/foo', { foo: 'bar' })
        .reply(200, { url: 'https://example.com/api/v2/foo' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.put('/foo', { foo: 'bar' });

      expect(response.config.url).toEqual('https://example.com/api/v2/foo');
    });

    it('does not modify full urls', async () => {
      const gitHubScope = nock('https://github.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .put('/users', { foo: 'bar' })
        .reply(200, { url: 'https://github.com/users' });

      const exampleScope = nock('https://example.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .put('/api/v2/users', { foo: 'bar' })
        .reply(404, { url: 'https://exmaple.com/api/v2/users' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.put('https://github.com/users', { foo: 'bar' });

      expect(gitHubScope.isDone()).toBe(true);
      expect(exampleScope.isDone()).toBe(false);
      expect(response.ok).toBe(true);
      expect(response.status).toEqual(200);
      expect(response.data).toEqual({ url: 'https://github.com/users' });
    });

    it('rejects when when an error occurs', async () => {
      nock('https://example.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .put('/api/v2/404', { foo: 'bar' })
        .reply(404, { message: 'Not Found' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.put('/404', { foo: 'bar' });

      expect(response.ok).toBe(false);
      expect(response.data).toEqual({ message: 'Not Found' });
      expect(response.status).toEqual(404);
      expect(response.statusText).toEqual('Not Found');
    });
  });

  describe('delete()', () => {
    it('createdClient delete creates full url from relative endpoint', async () => {
      nock('https://example.com:443')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .delete('/api/v2/foo')
        .reply(200);

      const client = createClient('https://example.com/api/v2');
      const response = await client.delete('foo');

      expect(response.config.url).toEqual('https://example.com/api/v2/foo');
    });

    it('does not double leading /', async () => {
      nock('https://example.com:443')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .delete('/api/v2/foo')
        .reply(200, { url: 'https://example.com/api/v2/foo' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.delete('/foo', { foo: 'bar' });

      expect(response.config.url).toEqual('https://example.com/api/v2/foo');
    });

    it('does not modify full urls', async () => {
      const gitHubScope = nock('https://github.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .delete('/users')
        .reply(200, { url: 'https://github.com/users' });

      const exampleScope = nock('https://example.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .delete('/api/v2/users')
        .reply(404, { url: 'https://exmaple.com/api/v2/users' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.delete('https://github.com/users', { foo: 'bar' });

      expect(gitHubScope.isDone()).toBe(true);
      expect(exampleScope.isDone()).toBe(false);
      expect(response.ok).toBe(true);
      expect(response.status).toEqual(200);
      expect(response.data).toEqual({ url: 'https://github.com/users' });
    });

    it('rejects when when an error occurs', async () => {
      nock('https://example.com')
        .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
        .delete('/api/v2/404')
        .reply(404, { message: 'Not Found' });

      const client = createClient('https://example.com/api/v2');
      const response = await client.delete('/404');

      expect(response.ok).toBe(false);
      expect(response.data).toEqual({ message: 'Not Found' });
      expect(response.status).toEqual(404);
      expect(response.statusText).toEqual('Not Found');
    });
  });
});
