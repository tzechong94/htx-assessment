export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (entity: string, id: number) =>
  new HttpError(404, 'NOT_FOUND', `${entity} ${id} not found`);
