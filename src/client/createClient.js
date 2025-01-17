import axios from 'axios';
import client from './client';

/**
 * This is a wrapper around client that allows for a base URL to be set once and then use realtive
 * endpoints from then on.
 *
 * This is just a light wrapper around an axios instance.
 */
class WrappedClient {
  /**
   *
   * @param {string} baseURL (optional) Sets the baseUrl for all requests so you can call client
   * methods using only the relative path to this base url. If no baseUrl is set, it will be set
   * to `window.location.origin` If this base URL is not a full url, then it will be used as a
   * prefix appended to `window.location.origin.
   * Eg: new WrappedClient('/api') => https://localhost/api
   * @param {object} options Options passed to the axios instance. See
   * https://github.com/axios/axios#request-config for information on available options
   */
  constructor(baseURL, options = {}) {
    this.baseURL = this.buildBaseUrl(baseURL);
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      ...options,
    });
  }

  /**
   * Returns the full URI for the provided path and options.
   *
   * Eg. getUri('/foo', { params: { bar: baz }}) => 'https://localhost/foo?bar=baz
   *
   * @param {string} path The endpoint path
   * @param {object} options Options for the request. See
   *  https://github.com/axios/axios#request-config for all valid properties that can be sent
   *  in the options object.
   * @param {object} options.params Params to send with the request
   * @return {string} full URI of the endpoint. Eg. https:/foo.com/bar?baz=foobar
   */
  getUri = (path = '', options = {}) => {
    const uri = this.axiosInstance.getUri({ url: path, ...options });
    let separator = '';
    if (!uri.startsWith('/')) {
      separator = '/';
    }
    return `${this.baseURL}${separator}${uri}`;
  };

  /**
   * Builds the base url. If a full domain name is passed, then returns that domain. If no value is
   * passed, will grab the value from `window.location.origin`. If relative path is passed, builds
   * the url from `window.location.origin` the provided relative path.
   * @param {string} baseUrl
   * @returns {string} Full base URL
   */
  buildBaseUrl(baseUrl) {
    let w = {};
    if (typeof window !== 'undefined') {
      w = window;
    }
    const windowUrl = ((w || {}).location || {}).origin || 'http://localhost';
    if (typeof baseUrl === 'undefined') {
      return windowUrl;
    }

    if (!baseUrl.startsWith('http')) {
      return `${windowUrl}${baseUrl.startsWith('/') ? '' : '/'}${baseUrl}`;
    }
    return baseUrl;
  }

  /**
   * Wrapps client.get by inspecting the endpoint, if it begins with http then it will  just pass
   * the entire url directly to client with no modification, otherwise it will prepend the base
   * url to the endpoint then call client.get().
   *
   * @see src/client/client.js:get for usage of this function.
   */
  get = (endpoint, options) => {
    return client.get(endpoint, options, this.axiosInstance);
  };

  /**
   * Wrapps client.put by inspecting the endpoint, if it begins with http then it will  just pass
   * the entire url directly to client with no modification, otherwise it will prepend the base
   * url to the endpoint then call client.put().
   *
   * @see src/client/client.js:put for usage of this function.
   */
  put = (endpoint, data, options) => {
    return client.put(endpoint, data, options, this.axiosInstance);
  };

  /**
   * Wrapps client.post by inspecting the endpoint, if it begins with http then it will  just pass
   * the entire url directly to client with no modification, otherwise it will prepend the base
   * url to the endpoint then call client.post().
   *
   * @see src/client/client.js:post for usage of this function.
   */
  post = (endpoint, data, options) => {
    return client.post(endpoint, data, options, this.axiosInstance);
  };

  /**
   * Wrapps client.postMultipart by inspecting the endpoint, if it begins with http then it will  just pass
   * the entire url directly to client with no modification, otherwise it will prepend the base
   * url to the endpoint then call client.postMultipart().
   *
   * @see src/client/client.js:postMultipart for usage of this function.
   */
  postMultipart = (endpoint, data, options) => {
    return client.postMultipart(endpoint, data, options, this.axiosInstance);
  };

  /**
   * Wrapps client.delete by inspecting the endpoint, if it begins with http then it will  just pass
   * the entire url directly to client with no modification, otherwise it will prepend the base
   * url to the endpoint then call client.delete().
   *
   * @see src/client/client.js:delete for usage of this function.
   */
  delete = (endpoint, options) => {
    return client.delete(endpoint, options, this.axiosInstance);
  };
}

export default function createClient(baseUrl, options = {}) {
  return new WrappedClient(baseUrl, options);
}
