export interface WebConfig {
  url: string;
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
  TRACE = 'TRACE',
  CONNECT = 'CONNECT',
}

export enum BodyType {
  NONE = 'NONE',
  JSON = 'JSON',
  FORM_DATA = 'FORM_DATA',
  TEXT = 'TEXT',
  RAW = 'RAW',
  URLENCODED = 'x-www-form-urlencoded',
}

export interface ApiConfig {
  endpoint: string;
  method: HttpMethod;
  headers: Record<string, string> | undefined;
  bodyType: BodyType;
  payload: string | Record<string, string> | undefined;
}
