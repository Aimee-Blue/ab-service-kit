import { EndpointHandler } from 'src/shared/kit';

export const pingHandler: EndpointHandler = (ctx, _next) => {
  ctx.body = "Yes, I'm rolling baby, doubly so!";
  ctx.status = 200;
};
