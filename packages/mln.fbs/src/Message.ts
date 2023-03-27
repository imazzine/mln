/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Network message type definition.
 */

import { getUid } from "@imazzine/mln.ts";
import { parse, stringify } from "uuid";
import { ByteBuffer, Builder } from "flatbuffers";
import { Method } from "./.fbs/enum.Method_generated";
import { Type } from "./.fbs/enum.Type_generated";
import { Header as _Header } from "./.fbs/struct.Header_generated";
import {
  Pipe as _Pipe,
  Path as _Path,
} from "./.fbs/struct.Pipe_generated";
import { Uid as _Uid } from "./.fbs/struct.Uid_generated";
import { Message as _Message } from "./.fbs/table.Message_generated";
import {
  Body as _Body,
  Binary as _Binary,
} from "./.fbs/union.Body_generated";

export type Path = {
  node: string;
  process: string;
  router: string;
};

export type Pipe = {
  source: Path;
  target: Path;
};

export type Body = string | Buffer;

export type MessageOpts =
  | Uint8Array
  | {
      type: Type;
      method: Method;
      pipe?: Pipe;
      body?: Body;
    };

export class Message {
  private _buffer: ByteBuffer;
  private _builder: Builder;
  private _message: _Message;

  public get uid(): null | string {
    const header = this._message.header(new _Header());
    if (header && header.uid()) {
      return this.parseUid(<_Uid>header.uid());
    }
    return null;
  }

  public get type(): null | Type {
    const type = this._message.header(new _Header())?.type();
    return typeof type === "number" ? type : null;
  }

  public get method(): null | Method {
    const method =
      this._message.header(new _Header())?.method() || null;
    return typeof method === "number" ? method : null;
  }

  public get pipe(): null | Pipe {
    const pipe = this._message.pipe(new _Pipe());
    if (!pipe) {
      return null;
    } else {
      const source = <_Path>pipe.source(new _Path());
      const target = <_Path>pipe.target(new _Path());
      return {
        source: this.parsePath(source),
        target: this.parsePath(target),
      };
    }
  }

  public get body(): null | Body {
    const type = this._message.bodyType();
    if (type === _Body.struct_Uid) {
      const _uid = <_Uid>this._message.body(new _Uid());
      return this.parseUid(_uid);
    }
    return null;
  }

  public get buffer(): Buffer {
    return Buffer.from(this._buffer.bytes());
  }

  constructor(opts: MessageOpts) {
    this._builder = new Builder(1024);
    if (opts instanceof Uint8Array) {
      this._buffer = new ByteBuffer(opts);
      this._message = _Message.getRootAsMessage(this._buffer);
    } else {
      _Message.startMessage(this._builder);
      _Message.addHeader(
        this._builder,
        _Header.createHeader(
          this._builder,
          <number[]>parse(getUid()),
          opts.type,
          opts.method,
        ),
      );
      if (opts.pipe) {
        _Message.addPipe(
          this._builder,
          _Pipe.createPipe(
            this._builder,
            <number[]>parse(opts.pipe.source.node),
            <number[]>parse(opts.pipe.source.process),
            <number[]>parse(opts.pipe.source.router),
            <number[]>parse(opts.pipe.target.node),
            <number[]>parse(opts.pipe.target.process),
            <number[]>parse(opts.pipe.target.router),
          ),
        );
      }
      if (opts.body) {
        if (typeof opts.body === "string") {
          _Message.addBodyType(this._builder, _Body.struct_Uid);
          _Message.addBody(
            this._builder,
            _Uid.createUid(this._builder, <number[]>parse(opts.body)),
          );
        }
      }
      this._builder.finish(_Message.endMessage(this._builder));
      this._buffer = new ByteBuffer(this._builder.asUint8Array());
      this._message = _Message.getRootAsMessage(this._buffer);
    }
  }

  private parsePath(_path: _Path): Path {
    return {
      node: this.parseUid(<_Uid>_path.node()),
      process: this.parseUid(<_Uid>_path.process()),
      router: this.parseUid(<_Uid>_path.router()),
    };
  }

  private parseUid(_uid: _Uid): string {
    const buf: number[] = [];
    for (let i = 0; i < _Uid.sizeOf(); i++) {
      buf.push(<number>_uid.uid(i));
    }
    return stringify(Buffer.from(buf));
  }
}
