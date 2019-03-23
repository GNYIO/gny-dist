"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function parseNums(obj, options) {
    let result = {}, key, value;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            value = obj[key];
            if (typeof value === 'string' && !isNaN(options.parser.call(null, value, 10, key))) {
                result[key] = options.parser.call(null, value, 10, key);
            }
            else if (value.constructor === Object) {
                result[key] = parseNums(value, options);
            }
            else {
                result[key] = value;
            }
        }
    }
    return result;
}
exports.default = parseNums;
//# sourceMappingURL=parse.js.map