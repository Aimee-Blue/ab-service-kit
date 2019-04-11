import { EndpointHandler } from 'src/shared/kit';

export const pingHandler: EndpointHandler = async (ctx, next) => {
  ctx.body = "Yes, I'm rolling baby, doubly so!";
  ctx.status = 200;
  await next();
};
