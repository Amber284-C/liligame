export const SITE_BASE = '/liligame';
export const sitePath = (path:string) => `${SITE_BASE}/${path.replace(/^\//,'')}`;
