import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Express 4 は async route handler の throw を自動キャッチしない。
// Router.prototype を事前パッチして、async 関数が reject したら next(err) に流す。
// index.ts の最初の import として読み込むことで全ルートに適用される。

function wrap(fn: unknown): unknown {
  if (typeof fn !== 'function') return fn;
  // 4引数 = エラーハンドラ (err, req, res, next) — ラップしない
  if (fn.length === 4) return fn;
  // 非 async 関数はそのまま
  if (fn.constructor.name !== 'AsyncFunction') return fn;

  return function (req: Request, res: Response, next: NextFunction) {
    Promise.resolve((fn as RequestHandler)(req, res, next)).catch(next);
  };
}

const proto = Router.prototype as unknown as Record<string, Function>;
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'all', 'use'];

for (const method of METHODS) {
  const original = proto[method];
  if (typeof original !== 'function') continue;
  proto[method] = function (this: unknown, ...args: unknown[]) {
    return original.apply(
      this,
      args.map((a) => (Array.isArray(a) ? a.map(wrap) : wrap(a)))
    );
  };
}
