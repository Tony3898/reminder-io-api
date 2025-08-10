import middy from '@middy/core';
import middyJsonBodyParser from '@middy/http-json-body-parser';

export const middyfy = (handler: any) => {
  return middy(handler).use({
    before: (request: any) => {
      const { event } = request;
      const method = event.httpMethod;

      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        return middyJsonBodyParser().before(request);
      }
    },
  });
};
