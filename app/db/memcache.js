const memcached = new Map();
const ts = new Date().getTime();
const attachKeyPrefix = (key) => `poker:${ts}:${key}`;
const isInvalidKey = (key) => !key || (typeof key !== 'string');

module.exports = {
    get(key) {
        if (isInvalidKey(key)) {
            return Promise.reject();
        }
        const value = memcached.get(attachKeyPrefix(key));
        if (!value) {
            return Promise.resolve(null);
        } else {
            return Promise.resolve(value);
        }
    },
    set(key, str) {
        if (isInvalidKey(key)) {
            return Promise.reject();
        }
        memcached.set(attachKeyPrefix(key), str);
        return Promise.resolve();
    },
    del(key) {
        if (isInvalidKey(key)) {
            return Promise.reject();
        }
        memcached.delete(attachKeyPrefix(key));
        return Promise.resolve();
    }
}