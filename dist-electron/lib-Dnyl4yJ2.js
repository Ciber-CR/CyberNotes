import { n as __require, t as __commonJSMin } from "./chunk-CegL5Rro.js";
//#region node_modules/better-sqlite3/lib/util.js
var require_util = /* @__PURE__ */ __commonJSMin(((exports) => {
	exports.getBooleanOption = (options, key) => {
		let value = false;
		if (key in options && typeof (value = options[key]) !== "boolean") throw new TypeError(`Expected the "${key}" option to be a boolean`);
		return value;
	};
	exports.cppdb = Symbol();
	exports.inspect = Symbol.for("nodejs.util.inspect.custom");
}));
//#endregion
//#region node_modules/better-sqlite3/lib/sqlite-error.js
var require_sqlite_error = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var descriptor = {
		value: "SqliteError",
		writable: true,
		enumerable: false,
		configurable: true
	};
	function SqliteError(message, code) {
		if (new.target !== SqliteError) return new SqliteError(message, code);
		if (typeof code !== "string") throw new TypeError("Expected second argument to be a string");
		Error.call(this, message);
		descriptor.value = "" + message;
		Object.defineProperty(this, "message", descriptor);
		Error.captureStackTrace(this, SqliteError);
		this.code = code;
	}
	Object.setPrototypeOf(SqliteError, Error);
	Object.setPrototypeOf(SqliteError.prototype, Error.prototype);
	Object.defineProperty(SqliteError.prototype, "name", descriptor);
	module.exports = SqliteError;
}));
//#endregion
//#region node_modules/file-uri-to-path/index.js
var require_file_uri_to_path = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Module dependencies.
	*/
	var sep = __require("path").sep || "/";
	/**
	* Module exports.
	*/
	module.exports = fileUriToPath;
	/**
	* File URI to Path function.
	*
	* @param {String} uri
	* @return {String} path
	* @api public
	*/
	function fileUriToPath(uri) {
		if ("string" != typeof uri || uri.length <= 7 || "file://" != uri.substring(0, 7)) throw new TypeError("must pass in a file:// URI to convert to a file path");
		var rest = decodeURI(uri.substring(7));
		var firstSlash = rest.indexOf("/");
		var host = rest.substring(0, firstSlash);
		var path = rest.substring(firstSlash + 1);
		if ("localhost" == host) host = "";
		if (host) host = sep + sep + host;
		path = path.replace(/^(.+)\|/, "$1:");
		if (sep == "\\") path = path.replace(/\//g, "\\");
		if (/^.+\:/.test(path)) {} else path = sep + path;
		return host + path;
	}
}));
//#endregion
//#region node_modules/bindings/bindings.js
var require_bindings = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Module dependencies.
	*/
	var fs$2 = __require("fs"), path$2 = __require("path"), fileURLToPath = require_file_uri_to_path(), join = path$2.join, dirname = path$2.dirname, exists = fs$2.accessSync && function(path) {
		try {
			fs$2.accessSync(path);
		} catch (e) {
			return false;
		}
		return true;
	} || fs$2.existsSync || path$2.existsSync, defaults = {
		arrow: process.env.NODE_BINDINGS_ARROW || " → ",
		compiled: process.env.NODE_BINDINGS_COMPILED_DIR || "compiled",
		platform: process.platform,
		arch: process.arch,
		nodePreGyp: "node-v" + process.versions.modules + "-" + process.platform + "-" + process.arch,
		version: process.versions.node,
		bindings: "bindings.node",
		try: [
			[
				"module_root",
				"build",
				"bindings"
			],
			[
				"module_root",
				"build",
				"Debug",
				"bindings"
			],
			[
				"module_root",
				"build",
				"Release",
				"bindings"
			],
			[
				"module_root",
				"out",
				"Debug",
				"bindings"
			],
			[
				"module_root",
				"Debug",
				"bindings"
			],
			[
				"module_root",
				"out",
				"Release",
				"bindings"
			],
			[
				"module_root",
				"Release",
				"bindings"
			],
			[
				"module_root",
				"build",
				"default",
				"bindings"
			],
			[
				"module_root",
				"compiled",
				"version",
				"platform",
				"arch",
				"bindings"
			],
			[
				"module_root",
				"addon-build",
				"release",
				"install-root",
				"bindings"
			],
			[
				"module_root",
				"addon-build",
				"debug",
				"install-root",
				"bindings"
			],
			[
				"module_root",
				"addon-build",
				"default",
				"install-root",
				"bindings"
			],
			[
				"module_root",
				"lib",
				"binding",
				"nodePreGyp",
				"bindings"
			]
		]
	};
	/**
	* The main `bindings()` function loads the compiled bindings for a given module.
	* It uses V8's Error API to determine the parent filename that this function is
	* being invoked from, which is then used to find the root directory.
	*/
	function bindings(opts) {
		if (typeof opts == "string") opts = { bindings: opts };
		else if (!opts) opts = {};
		Object.keys(defaults).map(function(i) {
			if (!(i in opts)) opts[i] = defaults[i];
		});
		if (!opts.module_root) opts.module_root = exports.getRoot(exports.getFileName());
		if (path$2.extname(opts.bindings) != ".node") opts.bindings += ".node";
		var requireFunc = typeof __webpack_require__ === "function" ? __non_webpack_require__ : __require;
		var tries = [], i = 0, l = opts.try.length, n, b, err;
		for (; i < l; i++) {
			n = join.apply(null, opts.try[i].map(function(p) {
				return opts[p] || p;
			}));
			tries.push(n);
			try {
				b = opts.path ? requireFunc.resolve(n) : requireFunc(n);
				if (!opts.path) b.path = n;
				return b;
			} catch (e) {
				if (e.code !== "MODULE_NOT_FOUND" && e.code !== "QUALIFIED_PATH_RESOLUTION_FAILED" && !/not find/i.test(e.message)) throw e;
			}
		}
		err = /* @__PURE__ */ new Error("Could not locate the bindings file. Tried:\n" + tries.map(function(a) {
			return opts.arrow + a;
		}).join("\n"));
		err.tries = tries;
		throw err;
	}
	module.exports = exports = bindings;
	/**
	* Gets the filename of the JavaScript file that invokes this function.
	* Used to help find the root directory of a module.
	* Optionally accepts an filename argument to skip when searching for the invoking filename
	*/
	exports.getFileName = function getFileName(calling_file) {
		var origPST = Error.prepareStackTrace, origSTL = Error.stackTraceLimit, dummy = {}, fileName;
		Error.stackTraceLimit = 10;
		Error.prepareStackTrace = function(e, st) {
			for (var i = 0, l = st.length; i < l; i++) {
				fileName = st[i].getFileName();
				if (fileName !== __filename) if (calling_file) {
					if (fileName !== calling_file) return;
				} else return;
			}
		};
		Error.captureStackTrace(dummy);
		dummy.stack;
		Error.prepareStackTrace = origPST;
		Error.stackTraceLimit = origSTL;
		if (fileName.indexOf("file://") === 0) fileName = fileURLToPath(fileName);
		return fileName;
	};
	/**
	* Gets the root directory of a module, given an arbitrary filename
	* somewhere in the module tree. The "root directory" is the directory
	* containing the `package.json` file.
	*
	*   In:  /home/nate/node-native-module/lib/index.js
	*   Out: /home/nate/node-native-module
	*/
	exports.getRoot = function getRoot(file) {
		var dir = dirname(file), prev;
		while (true) {
			if (dir === ".") dir = process.cwd();
			if (exists(join(dir, "package.json")) || exists(join(dir, "node_modules"))) return dir;
			if (prev === dir) throw new Error("Could not find module root given file: \"" + file + "\". Do you have a `package.json` file? ");
			prev = dir;
			dir = join(dir, "..");
		}
	};
}));
//#endregion
//#region node_modules/better-sqlite3/lib/methods/wrappers.js
var require_wrappers = /* @__PURE__ */ __commonJSMin(((exports) => {
	var { cppdb } = require_util();
	exports.prepare = function prepare(sql) {
		return this[cppdb].prepare(sql, this, false);
	};
	exports.exec = function exec(sql) {
		this[cppdb].exec(sql);
		return this;
	};
	exports.close = function close() {
		this[cppdb].close();
		return this;
	};
	exports.loadExtension = function loadExtension(...args) {
		this[cppdb].loadExtension(...args);
		return this;
	};
	exports.defaultSafeIntegers = function defaultSafeIntegers(...args) {
		this[cppdb].defaultSafeIntegers(...args);
		return this;
	};
	exports.unsafeMode = function unsafeMode(...args) {
		this[cppdb].unsafeMode(...args);
		return this;
	};
	exports.getters = {
		name: {
			get: function name() {
				return this[cppdb].name;
			},
			enumerable: true
		},
		open: {
			get: function open() {
				return this[cppdb].open;
			},
			enumerable: true
		},
		inTransaction: {
			get: function inTransaction() {
				return this[cppdb].inTransaction;
			},
			enumerable: true
		},
		readonly: {
			get: function readonly() {
				return this[cppdb].readonly;
			},
			enumerable: true
		},
		memory: {
			get: function memory() {
				return this[cppdb].memory;
			},
			enumerable: true
		}
	};
}));
//#endregion
//#region node_modules/better-sqlite3/lib/methods/transaction.js
var require_transaction = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { cppdb } = require_util();
	var controllers = /* @__PURE__ */ new WeakMap();
	module.exports = function transaction(fn) {
		if (typeof fn !== "function") throw new TypeError("Expected first argument to be a function");
		const db = this[cppdb];
		const controller = getController(db, this);
		const { apply } = Function.prototype;
		const properties = {
			default: { value: wrapTransaction(apply, fn, db, controller.default) },
			deferred: { value: wrapTransaction(apply, fn, db, controller.deferred) },
			immediate: { value: wrapTransaction(apply, fn, db, controller.immediate) },
			exclusive: { value: wrapTransaction(apply, fn, db, controller.exclusive) },
			database: {
				value: this,
				enumerable: true
			}
		};
		Object.defineProperties(properties.default.value, properties);
		Object.defineProperties(properties.deferred.value, properties);
		Object.defineProperties(properties.immediate.value, properties);
		Object.defineProperties(properties.exclusive.value, properties);
		return properties.default.value;
	};
	var getController = (db, self) => {
		let controller = controllers.get(db);
		if (!controller) {
			const shared = {
				commit: db.prepare("COMMIT", self, false),
				rollback: db.prepare("ROLLBACK", self, false),
				savepoint: db.prepare("SAVEPOINT `	_bs3.	`", self, false),
				release: db.prepare("RELEASE `	_bs3.	`", self, false),
				rollbackTo: db.prepare("ROLLBACK TO `	_bs3.	`", self, false)
			};
			controllers.set(db, controller = {
				default: Object.assign({ begin: db.prepare("BEGIN", self, false) }, shared),
				deferred: Object.assign({ begin: db.prepare("BEGIN DEFERRED", self, false) }, shared),
				immediate: Object.assign({ begin: db.prepare("BEGIN IMMEDIATE", self, false) }, shared),
				exclusive: Object.assign({ begin: db.prepare("BEGIN EXCLUSIVE", self, false) }, shared)
			});
		}
		return controller;
	};
	var wrapTransaction = (apply, fn, db, { begin, commit, rollback, savepoint, release, rollbackTo }) => function sqliteTransaction() {
		let before, after, undo;
		if (db.inTransaction) {
			before = savepoint;
			after = release;
			undo = rollbackTo;
		} else {
			before = begin;
			after = commit;
			undo = rollback;
		}
		before.run();
		try {
			const result = apply.call(fn, this, arguments);
			if (result && typeof result.then === "function") throw new TypeError("Transaction function cannot return a promise");
			after.run();
			return result;
		} catch (ex) {
			if (db.inTransaction) {
				undo.run();
				if (undo !== rollback) after.run();
			}
			throw ex;
		}
	};
}));
//#endregion
//#region node_modules/better-sqlite3/lib/methods/pragma.js
var require_pragma = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { getBooleanOption, cppdb } = require_util();
	module.exports = function pragma(source, options) {
		if (options == null) options = {};
		if (typeof source !== "string") throw new TypeError("Expected first argument to be a string");
		if (typeof options !== "object") throw new TypeError("Expected second argument to be an options object");
		const simple = getBooleanOption(options, "simple");
		const stmt = this[cppdb].prepare(`PRAGMA ${source}`, this, true);
		return simple ? stmt.pluck().get() : stmt.all();
	};
}));
//#endregion
//#region node_modules/better-sqlite3/lib/methods/backup.js
var require_backup = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var fs$1 = __require("fs");
	var path$1 = __require("path");
	var { promisify } = __require("util");
	var { cppdb } = require_util();
	var fsAccess = promisify(fs$1.access);
	module.exports = async function backup(filename, options) {
		if (options == null) options = {};
		if (typeof filename !== "string") throw new TypeError("Expected first argument to be a string");
		if (typeof options !== "object") throw new TypeError("Expected second argument to be an options object");
		filename = filename.trim();
		const attachedName = "attached" in options ? options.attached : "main";
		const handler = "progress" in options ? options.progress : null;
		if (!filename) throw new TypeError("Backup filename cannot be an empty string");
		if (filename === ":memory:") throw new TypeError("Invalid backup filename \":memory:\"");
		if (typeof attachedName !== "string") throw new TypeError("Expected the \"attached\" option to be a string");
		if (!attachedName) throw new TypeError("The \"attached\" option cannot be an empty string");
		if (handler != null && typeof handler !== "function") throw new TypeError("Expected the \"progress\" option to be a function");
		await fsAccess(path$1.dirname(filename)).catch(() => {
			throw new TypeError("Cannot save backup because the directory does not exist");
		});
		const isNewFile = await fsAccess(filename).then(() => false, () => true);
		return runBackup(this[cppdb].backup(this, attachedName, filename, isNewFile), handler || null);
	};
	var runBackup = (backup, handler) => {
		let rate = 0;
		let useDefault = true;
		return new Promise((resolve, reject) => {
			setImmediate(function step() {
				try {
					const progress = backup.transfer(rate);
					if (!progress.remainingPages) {
						backup.close();
						resolve(progress);
						return;
					}
					if (useDefault) {
						useDefault = false;
						rate = 100;
					}
					if (handler) {
						const ret = handler(progress);
						if (ret !== void 0) if (typeof ret === "number" && ret === ret) rate = Math.max(0, Math.min(2147483647, Math.round(ret)));
						else throw new TypeError("Expected progress callback to return a number or undefined");
					}
					setImmediate(step);
				} catch (err) {
					backup.close();
					reject(err);
				}
			});
		});
	};
}));
//#endregion
//#region node_modules/better-sqlite3/lib/methods/serialize.js
var require_serialize = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { cppdb } = require_util();
	module.exports = function serialize(options) {
		if (options == null) options = {};
		if (typeof options !== "object") throw new TypeError("Expected first argument to be an options object");
		const attachedName = "attached" in options ? options.attached : "main";
		if (typeof attachedName !== "string") throw new TypeError("Expected the \"attached\" option to be a string");
		if (!attachedName) throw new TypeError("The \"attached\" option cannot be an empty string");
		return this[cppdb].serialize(attachedName);
	};
}));
//#endregion
//#region node_modules/better-sqlite3/lib/methods/function.js
var require_function = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { getBooleanOption, cppdb } = require_util();
	module.exports = function defineFunction(name, options, fn) {
		if (options == null) options = {};
		if (typeof options === "function") {
			fn = options;
			options = {};
		}
		if (typeof name !== "string") throw new TypeError("Expected first argument to be a string");
		if (typeof fn !== "function") throw new TypeError("Expected last argument to be a function");
		if (typeof options !== "object") throw new TypeError("Expected second argument to be an options object");
		if (!name) throw new TypeError("User-defined function name cannot be an empty string");
		const safeIntegers = "safeIntegers" in options ? +getBooleanOption(options, "safeIntegers") : 2;
		const deterministic = getBooleanOption(options, "deterministic");
		const directOnly = getBooleanOption(options, "directOnly");
		const varargs = getBooleanOption(options, "varargs");
		let argCount = -1;
		if (!varargs) {
			argCount = fn.length;
			if (!Number.isInteger(argCount) || argCount < 0) throw new TypeError("Expected function.length to be a positive integer");
			if (argCount > 100) throw new RangeError("User-defined functions cannot have more than 100 arguments");
		}
		this[cppdb].function(fn, name, argCount, safeIntegers, deterministic, directOnly);
		return this;
	};
}));
//#endregion
//#region node_modules/better-sqlite3/lib/methods/aggregate.js
var require_aggregate = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { getBooleanOption, cppdb } = require_util();
	module.exports = function defineAggregate(name, options) {
		if (typeof name !== "string") throw new TypeError("Expected first argument to be a string");
		if (typeof options !== "object" || options === null) throw new TypeError("Expected second argument to be an options object");
		if (!name) throw new TypeError("User-defined function name cannot be an empty string");
		const start = "start" in options ? options.start : null;
		const step = getFunctionOption(options, "step", true);
		const inverse = getFunctionOption(options, "inverse", false);
		const result = getFunctionOption(options, "result", false);
		const safeIntegers = "safeIntegers" in options ? +getBooleanOption(options, "safeIntegers") : 2;
		const deterministic = getBooleanOption(options, "deterministic");
		const directOnly = getBooleanOption(options, "directOnly");
		const varargs = getBooleanOption(options, "varargs");
		let argCount = -1;
		if (!varargs) {
			argCount = Math.max(getLength(step), inverse ? getLength(inverse) : 0);
			if (argCount > 0) argCount -= 1;
			if (argCount > 100) throw new RangeError("User-defined functions cannot have more than 100 arguments");
		}
		this[cppdb].aggregate(start, step, inverse, result, name, argCount, safeIntegers, deterministic, directOnly);
		return this;
	};
	var getFunctionOption = (options, key, required) => {
		const value = key in options ? options[key] : null;
		if (typeof value === "function") return value;
		if (value != null) throw new TypeError(`Expected the "${key}" option to be a function`);
		if (required) throw new TypeError(`Missing required option "${key}"`);
		return null;
	};
	var getLength = ({ length }) => {
		if (Number.isInteger(length) && length >= 0) return length;
		throw new TypeError("Expected function.length to be a positive integer");
	};
}));
//#endregion
//#region node_modules/better-sqlite3/lib/methods/table.js
var require_table = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { cppdb } = require_util();
	module.exports = function defineTable(name, factory) {
		if (typeof name !== "string") throw new TypeError("Expected first argument to be a string");
		if (!name) throw new TypeError("Virtual table module name cannot be an empty string");
		let eponymous = false;
		if (typeof factory === "object" && factory !== null) {
			eponymous = true;
			factory = defer(parseTableDefinition(factory, "used", name));
		} else {
			if (typeof factory !== "function") throw new TypeError("Expected second argument to be a function or a table definition object");
			factory = wrapFactory(factory);
		}
		this[cppdb].table(factory, name, eponymous);
		return this;
	};
	function wrapFactory(factory) {
		return function virtualTableFactory(moduleName, databaseName, tableName, ...args) {
			const thisObject = {
				module: moduleName,
				database: databaseName,
				table: tableName
			};
			const def = apply.call(factory, thisObject, args);
			if (typeof def !== "object" || def === null) throw new TypeError(`Virtual table module "${moduleName}" did not return a table definition object`);
			return parseTableDefinition(def, "returned", moduleName);
		};
	}
	function parseTableDefinition(def, verb, moduleName) {
		if (!hasOwnProperty.call(def, "rows")) throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition without a "rows" property`);
		if (!hasOwnProperty.call(def, "columns")) throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition without a "columns" property`);
		const rows = def.rows;
		if (typeof rows !== "function" || Object.getPrototypeOf(rows) !== GeneratorFunctionPrototype) throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition with an invalid "rows" property (should be a generator function)`);
		let columns = def.columns;
		if (!Array.isArray(columns) || !(columns = [...columns]).every((x) => typeof x === "string")) throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition with an invalid "columns" property (should be an array of strings)`);
		if (columns.length !== new Set(columns).size) throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition with duplicate column names`);
		if (!columns.length) throw new RangeError(`Virtual table module "${moduleName}" ${verb} a table definition with zero columns`);
		let parameters;
		if (hasOwnProperty.call(def, "parameters")) {
			parameters = def.parameters;
			if (!Array.isArray(parameters) || !(parameters = [...parameters]).every((x) => typeof x === "string")) throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition with an invalid "parameters" property (should be an array of strings)`);
		} else parameters = inferParameters(rows);
		if (parameters.length !== new Set(parameters).size) throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition with duplicate parameter names`);
		if (parameters.length > 32) throw new RangeError(`Virtual table module "${moduleName}" ${verb} a table definition with more than the maximum number of 32 parameters`);
		for (const parameter of parameters) if (columns.includes(parameter)) throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition with column "${parameter}" which was ambiguously defined as both a column and parameter`);
		let safeIntegers = 2;
		if (hasOwnProperty.call(def, "safeIntegers")) {
			const bool = def.safeIntegers;
			if (typeof bool !== "boolean") throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition with an invalid "safeIntegers" property (should be a boolean)`);
			safeIntegers = +bool;
		}
		let directOnly = false;
		if (hasOwnProperty.call(def, "directOnly")) {
			directOnly = def.directOnly;
			if (typeof directOnly !== "boolean") throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition with an invalid "directOnly" property (should be a boolean)`);
		}
		return [
			`CREATE TABLE x(${[...parameters.map(identifier).map((str) => `${str} HIDDEN`), ...columns.map(identifier)].join(", ")});`,
			wrapGenerator(rows, new Map(columns.map((x, i) => [x, parameters.length + i])), moduleName),
			parameters,
			safeIntegers,
			directOnly
		];
	}
	function wrapGenerator(generator, columnMap, moduleName) {
		return function* virtualTable(...args) {
			const output = args.map((x) => Buffer.isBuffer(x) ? Buffer.from(x) : x);
			for (let i = 0; i < columnMap.size; ++i) output.push(null);
			for (const row of generator(...args)) if (Array.isArray(row)) {
				extractRowArray(row, output, columnMap.size, moduleName);
				yield output;
			} else if (typeof row === "object" && row !== null) {
				extractRowObject(row, output, columnMap, moduleName);
				yield output;
			} else throw new TypeError(`Virtual table module "${moduleName}" yielded something that isn't a valid row object`);
		};
	}
	function extractRowArray(row, output, columnCount, moduleName) {
		if (row.length !== columnCount) throw new TypeError(`Virtual table module "${moduleName}" yielded a row with an incorrect number of columns`);
		const offset = output.length - columnCount;
		for (let i = 0; i < columnCount; ++i) output[i + offset] = row[i];
	}
	function extractRowObject(row, output, columnMap, moduleName) {
		let count = 0;
		for (const key of Object.keys(row)) {
			const index = columnMap.get(key);
			if (index === void 0) throw new TypeError(`Virtual table module "${moduleName}" yielded a row with an undeclared column "${key}"`);
			output[index] = row[key];
			count += 1;
		}
		if (count !== columnMap.size) throw new TypeError(`Virtual table module "${moduleName}" yielded a row with missing columns`);
	}
	function inferParameters({ length }) {
		if (!Number.isInteger(length) || length < 0) throw new TypeError("Expected function.length to be a positive integer");
		const params = [];
		for (let i = 0; i < length; ++i) params.push(`$${i + 1}`);
		return params;
	}
	var { hasOwnProperty } = Object.prototype;
	var { apply } = Function.prototype;
	var GeneratorFunctionPrototype = Object.getPrototypeOf(function* () {});
	var identifier = (str) => `"${str.replace(/"/g, "\"\"")}"`;
	var defer = (x) => () => x;
}));
//#endregion
//#region node_modules/better-sqlite3/lib/methods/inspect.js
var require_inspect = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var DatabaseInspection = function Database() {};
	module.exports = function inspect(depth, opts) {
		return Object.assign(new DatabaseInspection(), this);
	};
}));
//#endregion
//#region node_modules/better-sqlite3/lib/database.js
var require_database = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var fs = __require("fs");
	var path = __require("path");
	var util = require_util();
	var SqliteError = require_sqlite_error();
	var DEFAULT_ADDON;
	function Database(filenameGiven, options) {
		if (new.target == null) return new Database(filenameGiven, options);
		let buffer;
		if (Buffer.isBuffer(filenameGiven)) {
			buffer = filenameGiven;
			filenameGiven = ":memory:";
		}
		if (filenameGiven == null) filenameGiven = "";
		if (options == null) options = {};
		if (typeof filenameGiven !== "string") throw new TypeError("Expected first argument to be a string");
		if (typeof options !== "object") throw new TypeError("Expected second argument to be an options object");
		if ("readOnly" in options) throw new TypeError("Misspelled option \"readOnly\" should be \"readonly\"");
		if ("memory" in options) throw new TypeError("Option \"memory\" was removed in v7.0.0 (use \":memory:\" filename instead)");
		const filename = filenameGiven.trim();
		const anonymous = filename === "" || filename === ":memory:";
		const readonly = util.getBooleanOption(options, "readonly");
		const fileMustExist = util.getBooleanOption(options, "fileMustExist");
		const timeout = "timeout" in options ? options.timeout : 5e3;
		const verbose = "verbose" in options ? options.verbose : null;
		const nativeBinding = "nativeBinding" in options ? options.nativeBinding : null;
		if (readonly && anonymous && !buffer) throw new TypeError("In-memory/temporary databases cannot be readonly");
		if (!Number.isInteger(timeout) || timeout < 0) throw new TypeError("Expected the \"timeout\" option to be a positive integer");
		if (timeout > 2147483647) throw new RangeError("Option \"timeout\" cannot be greater than 2147483647");
		if (verbose != null && typeof verbose !== "function") throw new TypeError("Expected the \"verbose\" option to be a function");
		if (nativeBinding != null && typeof nativeBinding !== "string" && typeof nativeBinding !== "object") throw new TypeError("Expected the \"nativeBinding\" option to be a string or addon object");
		let addon;
		if (nativeBinding == null) addon = DEFAULT_ADDON || (DEFAULT_ADDON = require_bindings()("better_sqlite3.node"));
		else if (typeof nativeBinding === "string") addon = (typeof __non_webpack_require__ === "function" ? __non_webpack_require__ : __require)(path.resolve(nativeBinding).replace(/(\.node)?$/, ".node"));
		else addon = nativeBinding;
		if (!addon.isInitialized) {
			addon.setErrorConstructor(SqliteError);
			addon.isInitialized = true;
		}
		if (!anonymous && !filename.startsWith("file:") && !fs.existsSync(path.dirname(filename))) throw new TypeError("Cannot open database because the directory does not exist");
		Object.defineProperties(this, {
			[util.cppdb]: { value: new addon.Database(filename, filenameGiven, anonymous, readonly, fileMustExist, timeout, verbose || null, buffer || null) },
			...wrappers.getters
		});
	}
	var wrappers = require_wrappers();
	Database.prototype.prepare = wrappers.prepare;
	Database.prototype.transaction = require_transaction();
	Database.prototype.pragma = require_pragma();
	Database.prototype.backup = require_backup();
	Database.prototype.serialize = require_serialize();
	Database.prototype.function = require_function();
	Database.prototype.aggregate = require_aggregate();
	Database.prototype.table = require_table();
	Database.prototype.loadExtension = wrappers.loadExtension;
	Database.prototype.exec = wrappers.exec;
	Database.prototype.close = wrappers.close;
	Database.prototype.defaultSafeIntegers = wrappers.defaultSafeIntegers;
	Database.prototype.unsafeMode = wrappers.unsafeMode;
	Database.prototype[util.inspect] = require_inspect();
	module.exports = Database;
}));
//#endregion
//#region node_modules/better-sqlite3/lib/index.js
var require_lib = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_database();
	module.exports.SqliteError = require_sqlite_error();
}));
//#endregion
export default require_lib();
