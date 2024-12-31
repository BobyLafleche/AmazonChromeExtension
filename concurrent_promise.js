(function(global) {
    'use strict';

    function ConcurrentPromise(limit) {
        this.limit = limit;
        this.queue = [];
        this.activeCount = 0;
    }

    ConcurrentPromise.prototype.add = function(promiseFn) {
        this.queue.push(promiseFn);
        this.runNext();
    };

    ConcurrentPromise.prototype.runNext = function() {
        if (this.activeCount < this.limit && this.queue.length > 0) {
            const promiseFn = this.queue.shift();
            this.activeCount++;
            promiseFn().then(() => {
                this.activeCount--;
                this.runNext();
            });
        }
    };

    global.ConcurrentPromise = ConcurrentPromise;
})(this);