/**
 * A minimal pool of postman-sandbox contexts.
 *
 * Each sandbox context is backed by its own uvm worker thread, so script
 * execution on different contexts runs on different threads and can use
 * multiple CPU cores. A single context executes one script at a time, so the
 * pool hands out one context per in-flight execution and queues callers when
 * all contexts are busy.
 *
 * The pool is intentionally simple: FIFO waiter queue, no priorities, no
 * dynamic resizing. Contexts are created up-front by the caller and handed to
 * the constructor.
 *
 * @private
 */
class SandboxPool {
    /**
     * @param {Array.<Object>} contexts - Ready postman-sandbox contexts.
     */
    constructor (contexts) {
        this.contexts = contexts || [];
        this.free = this.contexts.slice();
        this.waiters = [];
        this.disposed = false;
    }

    /**
     * Acquire a free context. If none is free, the callback is queued and
     * invoked as soon as a context is released (FIFO).
     *
     * @param {Function} callback - invoked with (context).
     */
    acquire (callback) {
        if (this.disposed) {
            return callback(null);
        }

        // hand out the next live context, skipping any that have been disposed
        // out-of-band (e.g. a raw host.dispose() on run.host).
        let context;

        while ((context = this.free.pop())) {
            if (context.isReady !== false) {
                return callback(context);
            }
        }

        this.waiters.push(callback);
    }

    /**
     * Return a context to the pool. If a caller is waiting, the context is
     * handed to it directly without touching the free list.
     *
     * @param {Object} context -
     */
    release (context) {
        // drop the context if the pool is disposed or the context itself was
        // disposed out-of-band — never re-issue a dead worker.
        if (!context || this.disposed || context.isReady === false) {
            return;
        }

        const waiter = this.waiters.shift();

        if (waiter) {
            // hand off directly to the next waiter to keep it hot
            return waiter(context);
        }

        this.free.push(context);
    }

    /**
     * Number of contexts in the pool.
     *
     * @returns {Number}
     */
    get size () {
        return this.contexts.length;
    }

    /**
     * Dispose every context in the pool.
     */
    dispose () {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        this.waiters = [];
        this.contexts.forEach((context) => {
            context && typeof context.dispose === 'function' && context.dispose();
        });
        this.contexts = [];
        this.free = [];
    }
}

module.exports = SandboxPool;
