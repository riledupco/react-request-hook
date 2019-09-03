import axios from 'axios';
import xhr from 'axios/lib/adapters/xhr';

const linkParseRegex = /<(.+?)>; rel="(.*)"/;
const emptyLinks = { first: null, last: null, prev: null, next: null };

/**
 * Returns the string of an HTTP status code.
 * @param {int} httpCode HTTP Code, eg, 404
 * @return {string} The coresponding statusText for that http code.
 */
function getStatusTextForCode(httpCode) {
  switch (httpCode) {
    case 400:
      return 'Bad Request';
    case 500:
      return 'Internal Server Error';
    default:
      return null;
  }
}

/**
 * Makes a request to the server by calling the axios function provided with the args provided.
 *
 * Returns a processes response with ok marking success or failure.
 *
 * @param {axios function} func The axios function to call
 * @param  {...any} args The args to pass
 */
async function makeRequest(func, ...args) {
  try {
    const response = await func(...args);
    return {
      ok: true,
      ...response,
    };
  } catch (error) {
    return processError(error);
  }
}

/**
 * Processes the Link header and splits the data into the two links
 * and returns the links in an array.
 * @param {*} response The response from the server which contains the xhr request.
 * @return {array} [nextLink, previousLink] urls.
 */
function processLinks(response) {
  // const linkHeader = response.xhr.getResponseHeader('Link');
  const linkHeader = response.headers.link;
  // Set the links to null by default. If they exist on the link header then they will
  // be added.
  let links = { ...emptyLinks };

  if (linkHeader) {
    /*
     * example header:
     * <https://api.github.com/users?per_page=5&since=5>; rel="next", <https://api.github.com/users?since=0>; rel="first"
     */
    const rawLinks = linkHeader.split(',');
    links = rawLinks.reduce((acc, link) => {
      const matches = link.match(linkParseRegex);

      // If prev link is set as previous, then make it 'prev' for consistency.
      if (matches[2] === 'previous') {
        matches[2] = 'prev';
      }

      // Sets something like next: url, or first: url
      acc[matches[2]] = matches[1];

      return acc;
    }, links);
  }
  return links;
}

/**
 * Processes an error during a request. This can be a server response error or an internal
 * exception while sending the request. It will return a proper error object that describes
 * the type of error and can be consumed by the user of the client.
 *
 * @param {object} error the exception thrown from the axios client.
 * @return {object} With the following properties:
 *  * {boolean} ok will be false due to error condition
 *  * {number} status The http status code of the response if there is one.
 *  * {string} statusText A message if provided to describe the status response. Null if none
 *  *               was supplied. If internal error will describe the error that occurred.
 *  * {object|array} data The data from the server if an error response was supplied.
 *  * {object} links The links object containing any link header URLS. All properties are
 *             guranteed to be present, but will be set to null since this is an error response.
 *  * {string} links.next The URL to get the next page. Will be null.
 *  * {string} links.prev The URL to get the previous page. Will be null.
 *  * {string} links.first The URL to get the first page. Will be null.
 *  * {string} links.last The URL to get the last page. Will be null.
 *  * See [https://github.com/axios/axios#response-schema]() for other properties sent in the
 *    request object.
 */
function processError(error) {
  // If error.response then server responded bad.
  // If error.request Then server didn't respond
  // Else, something bad happened creating the request
  if (error.response) {
    return {
      ok: false,
      links: { ...emptyLinks },
      ...error.response,
      statusText:
        error.response.message ||
        (error.response.data || {}).message ||
        ((error.response.data || {}).error || {}).message ||
        error.response.statusText ||
        getStatusTextForCode(error.response.status) ||
        null,
    };
  } else if (error.request) {
    const response = {
      ok: false,
      links: { ...emptyLinks },
      statusText: '',
      data: null,
      request: error.request,
      code: error.code,
    };

    switch (error.code) {
      case 'ENETUNREACH':
      case 'ENOTFOUND': {
        response.statusText = 'The server could not be reached or the URL was invalid.';
        break;
      }
      case 'ECONNABORTED': {
        response.statusText = `Connection was aborted: ${error.message}`;
        break;
      }
      default: {
        response.statusText =
          error.message ||
          'An unknown error occured making the request and we could not communicate with the server';
      }
    }

    return response;
  }

  return {
    ok: false,
    links: { ...emptyLinks },
    statusText: error.message || 'An Unknown error occurred with the Request',
    data: null,
  };
}

const client = {
  /**
   * Runs a get operation on the provided path and returns the data.
   *
   * @param {string} path The complete URL of the endpoint to get.
   * @param {object} options Options for the request. See
   *  https://github.com/axios/axios#request-config for all valid properties that can be sent
   *  in the options object.
   * @param {object} options.params Key/value pairs of parameters to pass to the request.
   * @param {object} options.headers Key/value pairs of headers to set on the request
   * @param {axios} instance (optional) Used to pass a custom axios instance to use instead of the
   *  global one.
   *
   * @return {object} With the following properties:
   *  * {boolean} ok False if the response contains an error.
   *  * {number} status The http status code of the response.
   *  * {string} statusText A message if provided to describe the status response. Null if none
   *  *               was supplied.
   *  * {object|array} data The data from the server.
   *  * {object} links The links object containing any link header URLS. All properties are
   *             guranteed to be present, but will be set to null if the link does not exist
   *             in the header. Otherwise, it will be set to the string URL value.
   *  * {string} links.next The URL to get the next page.
   *  * {string} links.prev The URL to get the previous page.
   *  * {string} links.first The URL to get the first page.
   *  * {string} links.last The URL to get the last page.
   *  * See [https://github.com/axios/axios#response-schema]() for other properties sent in the
   *    request object.
   */
  get: async (path, options, instance) => {
    const axiosInstance = instance || axios;

    const response = await makeRequest(axiosInstance.get, path, options);

    if (response.ok) {
      response.links = processLinks(response);
    }

    return response;
  },
  /**
   * Runs a POST operation on the provided path and returns the data.
   *
   * @param {string} path The complete URL of the endpoint to post.
   * @param {object} data The data to post to the server.
   * @param {object} options Options for the request. See
   *  https://github.com/axios/axios#request-config for all valid properties that can be sent
   *  in the options object.
   * @param {object} options.params Key/value pairs of parameters to pass to the request.
   * @param {object} options.headers Key/value pairs of headers to set on the request
   * @param {axios} instance (optional) Used to pass a custom axios instance to use instead of the
   *  global one.
   *
   * @return {object} With the following properties:
   *  * {boolean} ok False if the response contains an error.
   *  * {number} status The http status code of the response.
   *  * {string} statusText A message if provided to describe the status response. Null if none
   *  *               was supplied.
   *  * {object|array} data The data from the server.
   *  * See [https://github.com/axios/axios#response-schema]() for other properties sent in the
   *    request object.
   */
  post: async (path, data, options, instance) => {
    const axiosInstance = instance || axios;

    return makeRequest(axiosInstance.post, path, data, options);
  },
  /**
   * Runs a POST operation on the provided path and returns the data, but before
   * sending will convert data into a FormData object to send as a postMultipart
   * message.
   *
   * Note: Will always use axios xhr instance for this request since http
   * can't use FormMultipart.
   *
   * @param {string} path The complete URL of the endpoint to post.
   * @param {object} data The data/file to post to the server as FormData.
   * @param {object} options Options for the request. See
   *  https://github.com/axios/axios#request-config for all valid properties that can be sent
   *  in the options object.
   * @param {object} options.params Key/value pairs of parameters to pass to the request.
   * @param {object} options.headers Key/value pairs of headers to set on the request
   * @param {axios} instance (optional) Used to pass a custom axios instance to use instead of the
   *  global one.
   *
   * @return {object} With the following properties:
   *  * {boolean} ok False if the response contains an error.
   *  * {number} status The http status code of the response.
   *  * {string} statusText A message if provided to describe the status response. Null if none
   *  *               was supplied.
   *  * {object|array} data The data from the server.
   *  * See [https://github.com/axios/axios#response-schema]() for other properties sent in the
   *    request object.
   */
  postMultipart: async (path, file, options, instance) => {
    const axiosInstance = instance || axios;
    const opts = { ...options };
    opts.adapter = xhr;

    const data = new FormData();
    data.append('file', file);

    return makeRequest(axiosInstance.post, path, data, opts);
  },
  /**
   * Runs a PUT operation on the provided path and returns the data.
   *
   * @param {string} path The complete URL of the endpoint to put.
   * @param {object} data The data to put on the server.
   * @param {object} options Options for the request. See
   *  https://github.com/axios/axios#request-config for all valid properties that can be sent
   *  in the options object.
   * @param {object} options.params Key/value pairs of parameters to pass to the request.
   * @param {object} options.headers Key/value pairs of headers to set on the request
   * @param {axios} instance (optional) Used to pass a custom axios instance to use instead of the
   *  global one.
   *
   * @return {object} With the following properties:
   *  * {boolean} ok False if the response contains an error.
   *  * {number} status The http status code of the response.
   *  * {string} statusText A message if provided to describe the status response. Null if none
   *  *               was supplied.
   *  * {object|array} data The data from the server.
   *  * See [https://github.com/axios/axios#response-schema]() for other properties sent in the
   *    request object.
   */
  put: async (path, data, options, instance) => {
    const axiosInstance = instance || axios;

    return makeRequest(axiosInstance.put, path, data, options);
  },
  /**
   * Runs a DELETE operation on the provided path and returns the data.
   *
   * @param {string} path The complete URL of the endpoint to DELETE.
   * @param {object} options Options for the request. See
   *  https://github.com/axios/axios#request-config for all valid properties that can be sent
   *  in the options object.
   * @param {object} options.params Key/value pairs of parameters to pass to the request.
   * @param {object} options.headers Key/value pairs of headers to set on the request
   * @param {axios} instance (optional) Used to pass a custom axios instance to use instead of the
   *  global one.
   *
   * @return {object} With the following properties:
   *  * {boolean} ok False if the response contains an error.
   *  * {number} status The http status code of the response.
   *  * {string} statusText A message if provided to describe the status response. Null if none
   *  *               was supplied.
   *  * {object|array} data The data from the server.
   *  * See [https://github.com/axios/axios#response-schema]() for other properties sent in the
   *    request object.
   */
  delete: async (path, options, instance) => {
    const axiosInstance = instance || axios;

    return makeRequest(axiosInstance.delete, path, options);
  },
};

export default client;
