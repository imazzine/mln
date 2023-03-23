let _protocol: null | string = null;
let _url: null | string = null;
let _tenant: null | string = null;
let _token: null | string = null;

export function setTenant(tenant: string): void {
  _tenant = _tenant || tenant;
}

export function setToken(token: string): void {
  _token = token;
}

export function setProtocol(protocol: string): void {
  _protocol = _protocol || protocol;
}

export function getProtocol(): string {
  return _protocol || "mln.io/0.0.0";
}

export function setUrl(url: string): void {
  _url = _url || url;
}

export function getUrl(): string {
  return (
    `${_url || "ws://localhost:8080"}` +
    `/${_tenant || "common"}/${_token || "TOKEN"}`
  );
}
