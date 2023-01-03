/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the symbols.
 */

export const _uid = Symbol("_uid");
export const _state = Symbol("_state");
export const _constructed = Symbol("_constructed");
export const _destructed = Symbol("_destructed");
export const _stack = Symbol("_stack");
export const _logger = Symbol("_logger");
export const _timestamp = Symbol("_timestamp");
export const _type = Symbol("_type");
export const _message = Symbol("_message");
export const _level = Symbol("_level");
export const _timeout = Symbol("_timeout");
export const _buffer = Symbol("_buffer");
export const _errors = Symbol("_errors");
export const _debouncer = Symbol("_debouncer");
export const _binder = Symbol("_binder");
export const _scope = Symbol("_scope");

/**
 * Symbol to get access to the protected symbolic
 * {@link [syncBufferInternal] | `LogsBuffer[syncBufferInternal]`}
 * method.
 */
export const syncBufferInternal = Symbol("syncBufferInternal");

/**
 * Symbol to get access to the protected symbolic
 * {@link [destruct] | `Destructible[destruct]`} method.
 */
export const destruct = Symbol("destruct");
