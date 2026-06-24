export class ClientApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: unknown[]
  ) {
    super(message);
    this.name = "ClientApiError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}