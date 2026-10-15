function _mergeNamespaces(n2, m2) {
  for (var i2 = 0; i2 < m2.length; i2++) {
    const e2 = m2[i2];
    if (typeof e2 !== "string" && !Array.isArray(e2)) {
      for (const k2 in e2) {
        if (k2 !== "default" && !(k2 in n2)) {
          const d = Object.getOwnPropertyDescriptor(e2, k2);
          if (d) {
            Object.defineProperty(n2, k2, d.get ? d : {
              enumerable: true,
              get: () => e2[k2]
            });
          }
        }
      }
    }
  }
  return Object.freeze(Object.defineProperty(n2, Symbol.toStringTag, { value: "Module" }));
}
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
function getDefaultExportFromCjs(x2) {
  return x2 && x2.__esModule && Object.prototype.hasOwnProperty.call(x2, "default") ? x2["default"] : x2;
}
var jsxRuntime = { exports: {} };
var reactJsxRuntime_production_min = {};
var react = { exports: {} };
var react_production_min = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var l$4 = Symbol.for("react.element"), n$9 = Symbol.for("react.portal"), p$4 = Symbol.for("react.fragment"), q$1 = Symbol.for("react.strict_mode"), r$5 = Symbol.for("react.profiler"), t$5 = Symbol.for("react.provider"), u = Symbol.for("react.context"), v$1 = Symbol.for("react.forward_ref"), w = Symbol.for("react.suspense"), x = Symbol.for("react.memo"), y = Symbol.for("react.lazy"), z$1 = Symbol.iterator;
function A$1(a2) {
  if (null === a2 || "object" !== typeof a2) return null;
  a2 = z$1 && a2[z$1] || a2["@@iterator"];
  return "function" === typeof a2 ? a2 : null;
}
var B$1 = { isMounted: function() {
  return false;
}, enqueueForceUpdate: function() {
}, enqueueReplaceState: function() {
}, enqueueSetState: function() {
} }, C$1 = Object.assign, D$1 = {};
function E$1(a2, b, e2) {
  this.props = a2;
  this.context = b;
  this.refs = D$1;
  this.updater = e2 || B$1;
}
E$1.prototype.isReactComponent = {};
E$1.prototype.setState = function(a2, b) {
  if ("object" !== typeof a2 && "function" !== typeof a2 && null != a2) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
  this.updater.enqueueSetState(this, a2, b, "setState");
};
E$1.prototype.forceUpdate = function(a2) {
  this.updater.enqueueForceUpdate(this, a2, "forceUpdate");
};
function F() {
}
F.prototype = E$1.prototype;
function G$1(a2, b, e2) {
  this.props = a2;
  this.context = b;
  this.refs = D$1;
  this.updater = e2 || B$1;
}
var H$1 = G$1.prototype = new F();
H$1.constructor = G$1;
C$1(H$1, E$1.prototype);
H$1.isPureReactComponent = true;
var I$2 = Array.isArray, J = Object.prototype.hasOwnProperty, K$1 = { current: null }, L$1 = { key: true, ref: true, __self: true, __source: true };
function M$1(a2, b, e2) {
  var d, c2 = {}, k2 = null, h = null;
  if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k2 = "" + b.key), b) J.call(b, d) && !L$1.hasOwnProperty(d) && (c2[d] = b[d]);
  var g = arguments.length - 2;
  if (1 === g) c2.children = e2;
  else if (1 < g) {
    for (var f2 = Array(g), m2 = 0; m2 < g; m2++) f2[m2] = arguments[m2 + 2];
    c2.children = f2;
  }
  if (a2 && a2.defaultProps) for (d in g = a2.defaultProps, g) void 0 === c2[d] && (c2[d] = g[d]);
  return { $$typeof: l$4, type: a2, key: k2, ref: h, props: c2, _owner: K$1.current };
}
function N$1(a2, b) {
  return { $$typeof: l$4, type: a2.type, key: b, ref: a2.ref, props: a2.props, _owner: a2._owner };
}
function O$1(a2) {
  return "object" === typeof a2 && null !== a2 && a2.$$typeof === l$4;
}
function escape(a2) {
  var b = { "=": "=0", ":": "=2" };
  return "$" + a2.replace(/[=:]/g, function(a3) {
    return b[a3];
  });
}
var P$1 = /\/+/g;
function Q$1(a2, b) {
  return "object" === typeof a2 && null !== a2 && null != a2.key ? escape("" + a2.key) : b.toString(36);
}
function R$1(a2, b, e2, d, c2) {
  var k2 = typeof a2;
  if ("undefined" === k2 || "boolean" === k2) a2 = null;
  var h = false;
  if (null === a2) h = true;
  else switch (k2) {
    case "string":
    case "number":
      h = true;
      break;
    case "object":
      switch (a2.$$typeof) {
        case l$4:
        case n$9:
          h = true;
      }
  }
  if (h) return h = a2, c2 = c2(h), a2 = "" === d ? "." + Q$1(h, 0) : d, I$2(c2) ? (e2 = "", null != a2 && (e2 = a2.replace(P$1, "$&/") + "/"), R$1(c2, b, e2, "", function(a3) {
    return a3;
  })) : null != c2 && (O$1(c2) && (c2 = N$1(c2, e2 + (!c2.key || h && h.key === c2.key ? "" : ("" + c2.key).replace(P$1, "$&/") + "/") + a2)), b.push(c2)), 1;
  h = 0;
  d = "" === d ? "." : d + ":";
  if (I$2(a2)) for (var g = 0; g < a2.length; g++) {
    k2 = a2[g];
    var f2 = d + Q$1(k2, g);
    h += R$1(k2, b, e2, f2, c2);
  }
  else if (f2 = A$1(a2), "function" === typeof f2) for (a2 = f2.call(a2), g = 0; !(k2 = a2.next()).done; ) k2 = k2.value, f2 = d + Q$1(k2, g++), h += R$1(k2, b, e2, f2, c2);
  else if ("object" === k2) throw b = String(a2), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a2).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
  return h;
}
function S$1(a2, b, e2) {
  if (null == a2) return a2;
  var d = [], c2 = 0;
  R$1(a2, d, "", "", function(a3) {
    return b.call(e2, a3, c2++);
  });
  return d;
}
function T$1(a2) {
  if (-1 === a2._status) {
    var b = a2._result;
    b = b();
    b.then(function(b2) {
      if (0 === a2._status || -1 === a2._status) a2._status = 1, a2._result = b2;
    }, function(b2) {
      if (0 === a2._status || -1 === a2._status) a2._status = 2, a2._result = b2;
    });
    -1 === a2._status && (a2._status = 0, a2._result = b);
  }
  if (1 === a2._status) return a2._result.default;
  throw a2._result;
}
var U$1 = { current: null }, V$1 = { transition: null }, W$1 = { ReactCurrentDispatcher: U$1, ReactCurrentBatchConfig: V$1, ReactCurrentOwner: K$1 };
function X$1() {
  throw Error("act(...) is not supported in production builds of React.");
}
react_production_min.Children = { map: S$1, forEach: function(a2, b, e2) {
  S$1(a2, function() {
    b.apply(this, arguments);
  }, e2);
}, count: function(a2) {
  var b = 0;
  S$1(a2, function() {
    b++;
  });
  return b;
}, toArray: function(a2) {
  return S$1(a2, function(a3) {
    return a3;
  }) || [];
}, only: function(a2) {
  if (!O$1(a2)) throw Error("React.Children.only expected to receive a single React element child.");
  return a2;
} };
react_production_min.Component = E$1;
react_production_min.Fragment = p$4;
react_production_min.Profiler = r$5;
react_production_min.PureComponent = G$1;
react_production_min.StrictMode = q$1;
react_production_min.Suspense = w;
react_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W$1;
react_production_min.act = X$1;
react_production_min.cloneElement = function(a2, b, e2) {
  if (null === a2 || void 0 === a2) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a2 + ".");
  var d = C$1({}, a2.props), c2 = a2.key, k2 = a2.ref, h = a2._owner;
  if (null != b) {
    void 0 !== b.ref && (k2 = b.ref, h = K$1.current);
    void 0 !== b.key && (c2 = "" + b.key);
    if (a2.type && a2.type.defaultProps) var g = a2.type.defaultProps;
    for (f2 in b) J.call(b, f2) && !L$1.hasOwnProperty(f2) && (d[f2] = void 0 === b[f2] && void 0 !== g ? g[f2] : b[f2]);
  }
  var f2 = arguments.length - 2;
  if (1 === f2) d.children = e2;
  else if (1 < f2) {
    g = Array(f2);
    for (var m2 = 0; m2 < f2; m2++) g[m2] = arguments[m2 + 2];
    d.children = g;
  }
  return { $$typeof: l$4, type: a2.type, key: c2, ref: k2, props: d, _owner: h };
};
react_production_min.createContext = function(a2) {
  a2 = { $$typeof: u, _currentValue: a2, _currentValue2: a2, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
  a2.Provider = { $$typeof: t$5, _context: a2 };
  return a2.Consumer = a2;
};
react_production_min.createElement = M$1;
react_production_min.createFactory = function(a2) {
  var b = M$1.bind(null, a2);
  b.type = a2;
  return b;
};
react_production_min.createRef = function() {
  return { current: null };
};
react_production_min.forwardRef = function(a2) {
  return { $$typeof: v$1, render: a2 };
};
react_production_min.isValidElement = O$1;
react_production_min.lazy = function(a2) {
  return { $$typeof: y, _payload: { _status: -1, _result: a2 }, _init: T$1 };
};
react_production_min.memo = function(a2, b) {
  return { $$typeof: x, type: a2, compare: void 0 === b ? null : b };
};
react_production_min.startTransition = function(a2) {
  var b = V$1.transition;
  V$1.transition = {};
  try {
    a2();
  } finally {
    V$1.transition = b;
  }
};
react_production_min.unstable_act = X$1;
react_production_min.useCallback = function(a2, b) {
  return U$1.current.useCallback(a2, b);
};
react_production_min.useContext = function(a2) {
  return U$1.current.useContext(a2);
};
react_production_min.useDebugValue = function() {
};
react_production_min.useDeferredValue = function(a2) {
  return U$1.current.useDeferredValue(a2);
};
react_production_min.useEffect = function(a2, b) {
  return U$1.current.useEffect(a2, b);
};
react_production_min.useId = function() {
  return U$1.current.useId();
};
react_production_min.useImperativeHandle = function(a2, b, e2) {
  return U$1.current.useImperativeHandle(a2, b, e2);
};
react_production_min.useInsertionEffect = function(a2, b) {
  return U$1.current.useInsertionEffect(a2, b);
};
react_production_min.useLayoutEffect = function(a2, b) {
  return U$1.current.useLayoutEffect(a2, b);
};
react_production_min.useMemo = function(a2, b) {
  return U$1.current.useMemo(a2, b);
};
react_production_min.useReducer = function(a2, b, e2) {
  return U$1.current.useReducer(a2, b, e2);
};
react_production_min.useRef = function(a2) {
  return U$1.current.useRef(a2);
};
react_production_min.useState = function(a2) {
  return U$1.current.useState(a2);
};
react_production_min.useSyncExternalStore = function(a2, b, e2) {
  return U$1.current.useSyncExternalStore(a2, b, e2);
};
react_production_min.useTransition = function() {
  return U$1.current.useTransition();
};
react_production_min.version = "18.3.1";
{
  react.exports = react_production_min;
}
var reactExports = react.exports;
const index = /* @__PURE__ */ getDefaultExportFromCjs(reactExports);
const React = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: index
}, [reactExports]);
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var f$1 = reactExports, k = Symbol.for("react.element"), l$3 = Symbol.for("react.fragment"), m$6 = Object.prototype.hasOwnProperty, n$8 = f$1.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, p$3 = { key: true, ref: true, __self: true, __source: true };
function q(c2, a2, g) {
  var b, d = {}, e2 = null, h = null;
  void 0 !== g && (e2 = "" + g);
  void 0 !== a2.key && (e2 = "" + a2.key);
  void 0 !== a2.ref && (h = a2.ref);
  for (b in a2) m$6.call(a2, b) && !p$3.hasOwnProperty(b) && (d[b] = a2[b]);
  if (c2 && c2.defaultProps) for (b in a2 = c2.defaultProps, a2) void 0 === d[b] && (d[b] = a2[b]);
  return { $$typeof: k, type: c2, key: e2, ref: h, props: d, _owner: n$8.current };
}
reactJsxRuntime_production_min.Fragment = l$3;
reactJsxRuntime_production_min.jsx = q;
reactJsxRuntime_production_min.jsxs = q;
{
  jsxRuntime.exports = reactJsxRuntime_production_min;
}
var jsxRuntimeExports = jsxRuntime.exports;
var reactDom = { exports: {} };
var reactDom_production_min = {};
var scheduler = { exports: {} };
var scheduler_production_min = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
(function(exports) {
  function f2(a2, b) {
    var c2 = a2.length;
    a2.push(b);
    a: for (; 0 < c2; ) {
      var d = c2 - 1 >>> 1, e2 = a2[d];
      if (0 < g(e2, b)) a2[d] = b, a2[c2] = e2, c2 = d;
      else break a;
    }
  }
  function h(a2) {
    return 0 === a2.length ? null : a2[0];
  }
  function k2(a2) {
    if (0 === a2.length) return null;
    var b = a2[0], c2 = a2.pop();
    if (c2 !== b) {
      a2[0] = c2;
      a: for (var d = 0, e2 = a2.length, w2 = e2 >>> 1; d < w2; ) {
        var m2 = 2 * (d + 1) - 1, C2 = a2[m2], n2 = m2 + 1, x2 = a2[n2];
        if (0 > g(C2, c2)) n2 < e2 && 0 > g(x2, C2) ? (a2[d] = x2, a2[n2] = c2, d = n2) : (a2[d] = C2, a2[m2] = c2, d = m2);
        else if (n2 < e2 && 0 > g(x2, c2)) a2[d] = x2, a2[n2] = c2, d = n2;
        else break a;
      }
    }
    return b;
  }
  function g(a2, b) {
    var c2 = a2.sortIndex - b.sortIndex;
    return 0 !== c2 ? c2 : a2.id - b.id;
  }
  if ("object" === typeof performance && "function" === typeof performance.now) {
    var l2 = performance;
    exports.unstable_now = function() {
      return l2.now();
    };
  } else {
    var p2 = Date, q2 = p2.now();
    exports.unstable_now = function() {
      return p2.now() - q2;
    };
  }
  var r2 = [], t2 = [], u2 = 1, v2 = null, y2 = 3, z2 = false, A2 = false, B2 = false, D2 = "function" === typeof setTimeout ? setTimeout : null, E2 = "function" === typeof clearTimeout ? clearTimeout : null, F2 = "undefined" !== typeof setImmediate ? setImmediate : null;
  "undefined" !== typeof navigator && void 0 !== navigator.scheduling && void 0 !== navigator.scheduling.isInputPending && navigator.scheduling.isInputPending.bind(navigator.scheduling);
  function G2(a2) {
    for (var b = h(t2); null !== b; ) {
      if (null === b.callback) k2(t2);
      else if (b.startTime <= a2) k2(t2), b.sortIndex = b.expirationTime, f2(r2, b);
      else break;
      b = h(t2);
    }
  }
  function H2(a2) {
    B2 = false;
    G2(a2);
    if (!A2) if (null !== h(r2)) A2 = true, I2(J2);
    else {
      var b = h(t2);
      null !== b && K2(H2, b.startTime - a2);
    }
  }
  function J2(a2, b) {
    A2 = false;
    B2 && (B2 = false, E2(L2), L2 = -1);
    z2 = true;
    var c2 = y2;
    try {
      G2(b);
      for (v2 = h(r2); null !== v2 && (!(v2.expirationTime > b) || a2 && !M2()); ) {
        var d = v2.callback;
        if ("function" === typeof d) {
          v2.callback = null;
          y2 = v2.priorityLevel;
          var e2 = d(v2.expirationTime <= b);
          b = exports.unstable_now();
          "function" === typeof e2 ? v2.callback = e2 : v2 === h(r2) && k2(r2);
          G2(b);
        } else k2(r2);
        v2 = h(r2);
      }
      if (null !== v2) var w2 = true;
      else {
        var m2 = h(t2);
        null !== m2 && K2(H2, m2.startTime - b);
        w2 = false;
      }
      return w2;
    } finally {
      v2 = null, y2 = c2, z2 = false;
    }
  }
  var N2 = false, O2 = null, L2 = -1, P2 = 5, Q2 = -1;
  function M2() {
    return exports.unstable_now() - Q2 < P2 ? false : true;
  }
  function R2() {
    if (null !== O2) {
      var a2 = exports.unstable_now();
      Q2 = a2;
      var b = true;
      try {
        b = O2(true, a2);
      } finally {
        b ? S2() : (N2 = false, O2 = null);
      }
    } else N2 = false;
  }
  var S2;
  if ("function" === typeof F2) S2 = function() {
    F2(R2);
  };
  else if ("undefined" !== typeof MessageChannel) {
    var T2 = new MessageChannel(), U2 = T2.port2;
    T2.port1.onmessage = R2;
    S2 = function() {
      U2.postMessage(null);
    };
  } else S2 = function() {
    D2(R2, 0);
  };
  function I2(a2) {
    O2 = a2;
    N2 || (N2 = true, S2());
  }
  function K2(a2, b) {
    L2 = D2(function() {
      a2(exports.unstable_now());
    }, b);
  }
  exports.unstable_IdlePriority = 5;
  exports.unstable_ImmediatePriority = 1;
  exports.unstable_LowPriority = 4;
  exports.unstable_NormalPriority = 3;
  exports.unstable_Profiling = null;
  exports.unstable_UserBlockingPriority = 2;
  exports.unstable_cancelCallback = function(a2) {
    a2.callback = null;
  };
  exports.unstable_continueExecution = function() {
    A2 || z2 || (A2 = true, I2(J2));
  };
  exports.unstable_forceFrameRate = function(a2) {
    0 > a2 || 125 < a2 ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : P2 = 0 < a2 ? Math.floor(1e3 / a2) : 5;
  };
  exports.unstable_getCurrentPriorityLevel = function() {
    return y2;
  };
  exports.unstable_getFirstCallbackNode = function() {
    return h(r2);
  };
  exports.unstable_next = function(a2) {
    switch (y2) {
      case 1:
      case 2:
      case 3:
        var b = 3;
        break;
      default:
        b = y2;
    }
    var c2 = y2;
    y2 = b;
    try {
      return a2();
    } finally {
      y2 = c2;
    }
  };
  exports.unstable_pauseExecution = function() {
  };
  exports.unstable_requestPaint = function() {
  };
  exports.unstable_runWithPriority = function(a2, b) {
    switch (a2) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        break;
      default:
        a2 = 3;
    }
    var c2 = y2;
    y2 = a2;
    try {
      return b();
    } finally {
      y2 = c2;
    }
  };
  exports.unstable_scheduleCallback = function(a2, b, c2) {
    var d = exports.unstable_now();
    "object" === typeof c2 && null !== c2 ? (c2 = c2.delay, c2 = "number" === typeof c2 && 0 < c2 ? d + c2 : d) : c2 = d;
    switch (a2) {
      case 1:
        var e2 = -1;
        break;
      case 2:
        e2 = 250;
        break;
      case 5:
        e2 = 1073741823;
        break;
      case 4:
        e2 = 1e4;
        break;
      default:
        e2 = 5e3;
    }
    e2 = c2 + e2;
    a2 = { id: u2++, callback: b, priorityLevel: a2, startTime: c2, expirationTime: e2, sortIndex: -1 };
    c2 > d ? (a2.sortIndex = c2, f2(t2, a2), null === h(r2) && a2 === h(t2) && (B2 ? (E2(L2), L2 = -1) : B2 = true, K2(H2, c2 - d))) : (a2.sortIndex = e2, f2(r2, a2), A2 || z2 || (A2 = true, I2(J2)));
    return a2;
  };
  exports.unstable_shouldYield = M2;
  exports.unstable_wrapCallback = function(a2) {
    var b = y2;
    return function() {
      var c2 = y2;
      y2 = b;
      try {
        return a2.apply(this, arguments);
      } finally {
        y2 = c2;
      }
    };
  };
})(scheduler_production_min);
{
  scheduler.exports = scheduler_production_min;
}
var schedulerExports = scheduler.exports;
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var aa = reactExports, ca = schedulerExports;
function p$2(a2) {
  for (var b = "https://reactjs.org/docs/error-decoder.html?invariant=" + a2, c2 = 1; c2 < arguments.length; c2++) b += "&args[]=" + encodeURIComponent(arguments[c2]);
  return "Minified React error #" + a2 + "; visit " + b + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}
var da = /* @__PURE__ */ new Set(), ea = {};
function fa(a2, b) {
  ha(a2, b);
  ha(a2 + "Capture", b);
}
function ha(a2, b) {
  ea[a2] = b;
  for (a2 = 0; a2 < b.length; a2++) da.add(b[a2]);
}
var ia = !("undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement), ja = Object.prototype.hasOwnProperty, ka = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, la = {}, ma = {};
function oa(a2) {
  if (ja.call(ma, a2)) return true;
  if (ja.call(la, a2)) return false;
  if (ka.test(a2)) return ma[a2] = true;
  la[a2] = true;
  return false;
}
function pa(a2, b, c2, d) {
  if (null !== c2 && 0 === c2.type) return false;
  switch (typeof b) {
    case "function":
    case "symbol":
      return true;
    case "boolean":
      if (d) return false;
      if (null !== c2) return !c2.acceptsBooleans;
      a2 = a2.toLowerCase().slice(0, 5);
      return "data-" !== a2 && "aria-" !== a2;
    default:
      return false;
  }
}
function qa(a2, b, c2, d) {
  if (null === b || "undefined" === typeof b || pa(a2, b, c2, d)) return true;
  if (d) return false;
  if (null !== c2) switch (c2.type) {
    case 3:
      return !b;
    case 4:
      return false === b;
    case 5:
      return isNaN(b);
    case 6:
      return isNaN(b) || 1 > b;
  }
  return false;
}
function v(a2, b, c2, d, e2, f2, g) {
  this.acceptsBooleans = 2 === b || 3 === b || 4 === b;
  this.attributeName = d;
  this.attributeNamespace = e2;
  this.mustUseProperty = c2;
  this.propertyName = a2;
  this.type = b;
  this.sanitizeURL = f2;
  this.removeEmptyString = g;
}
var z = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(a2) {
  z[a2] = new v(a2, 0, false, a2, null, false, false);
});
[["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(a2) {
  var b = a2[0];
  z[b] = new v(b, 1, false, a2[1], null, false, false);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function(a2) {
  z[a2] = new v(a2, 2, false, a2.toLowerCase(), null, false, false);
});
["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(a2) {
  z[a2] = new v(a2, 2, false, a2, null, false, false);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(a2) {
  z[a2] = new v(a2, 3, false, a2.toLowerCase(), null, false, false);
});
["checked", "multiple", "muted", "selected"].forEach(function(a2) {
  z[a2] = new v(a2, 3, true, a2, null, false, false);
});
["capture", "download"].forEach(function(a2) {
  z[a2] = new v(a2, 4, false, a2, null, false, false);
});
["cols", "rows", "size", "span"].forEach(function(a2) {
  z[a2] = new v(a2, 6, false, a2, null, false, false);
});
["rowSpan", "start"].forEach(function(a2) {
  z[a2] = new v(a2, 5, false, a2.toLowerCase(), null, false, false);
});
var ra = /[\-:]([a-z])/g;
function sa(a2) {
  return a2[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(a2) {
  var b = a2.replace(
    ra,
    sa
  );
  z[b] = new v(b, 1, false, a2, null, false, false);
});
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(a2) {
  var b = a2.replace(ra, sa);
  z[b] = new v(b, 1, false, a2, "http://www.w3.org/1999/xlink", false, false);
});
["xml:base", "xml:lang", "xml:space"].forEach(function(a2) {
  var b = a2.replace(ra, sa);
  z[b] = new v(b, 1, false, a2, "http://www.w3.org/XML/1998/namespace", false, false);
});
["tabIndex", "crossOrigin"].forEach(function(a2) {
  z[a2] = new v(a2, 1, false, a2.toLowerCase(), null, false, false);
});
z.xlinkHref = new v("xlinkHref", 1, false, "xlink:href", "http://www.w3.org/1999/xlink", true, false);
["src", "href", "action", "formAction"].forEach(function(a2) {
  z[a2] = new v(a2, 1, false, a2.toLowerCase(), null, true, true);
});
function ta(a2, b, c2, d) {
  var e2 = z.hasOwnProperty(b) ? z[b] : null;
  if (null !== e2 ? 0 !== e2.type : d || !(2 < b.length) || "o" !== b[0] && "O" !== b[0] || "n" !== b[1] && "N" !== b[1]) qa(b, c2, e2, d) && (c2 = null), d || null === e2 ? oa(b) && (null === c2 ? a2.removeAttribute(b) : a2.setAttribute(b, "" + c2)) : e2.mustUseProperty ? a2[e2.propertyName] = null === c2 ? 3 === e2.type ? false : "" : c2 : (b = e2.attributeName, d = e2.attributeNamespace, null === c2 ? a2.removeAttribute(b) : (e2 = e2.type, c2 = 3 === e2 || 4 === e2 && true === c2 ? "" : "" + c2, d ? a2.setAttributeNS(d, b, c2) : a2.setAttribute(b, c2)));
}
var ua = aa.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, va = Symbol.for("react.element"), wa = Symbol.for("react.portal"), ya = Symbol.for("react.fragment"), za = Symbol.for("react.strict_mode"), Aa = Symbol.for("react.profiler"), Ba = Symbol.for("react.provider"), Ca = Symbol.for("react.context"), Da = Symbol.for("react.forward_ref"), Ea = Symbol.for("react.suspense"), Fa = Symbol.for("react.suspense_list"), Ga = Symbol.for("react.memo"), Ha = Symbol.for("react.lazy");
var Ia = Symbol.for("react.offscreen");
var Ja = Symbol.iterator;
function Ka(a2) {
  if (null === a2 || "object" !== typeof a2) return null;
  a2 = Ja && a2[Ja] || a2["@@iterator"];
  return "function" === typeof a2 ? a2 : null;
}
var A = Object.assign, La;
function Ma(a2) {
  if (void 0 === La) try {
    throw Error();
  } catch (c2) {
    var b = c2.stack.trim().match(/\n( *(at )?)/);
    La = b && b[1] || "";
  }
  return "\n" + La + a2;
}
var Na = false;
function Oa(a2, b) {
  if (!a2 || Na) return "";
  Na = true;
  var c2 = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    if (b) if (b = function() {
      throw Error();
    }, Object.defineProperty(b.prototype, "props", { set: function() {
      throw Error();
    } }), "object" === typeof Reflect && Reflect.construct) {
      try {
        Reflect.construct(b, []);
      } catch (l2) {
        var d = l2;
      }
      Reflect.construct(a2, [], b);
    } else {
      try {
        b.call();
      } catch (l2) {
        d = l2;
      }
      a2.call(b.prototype);
    }
    else {
      try {
        throw Error();
      } catch (l2) {
        d = l2;
      }
      a2();
    }
  } catch (l2) {
    if (l2 && d && "string" === typeof l2.stack) {
      for (var e2 = l2.stack.split("\n"), f2 = d.stack.split("\n"), g = e2.length - 1, h = f2.length - 1; 1 <= g && 0 <= h && e2[g] !== f2[h]; ) h--;
      for (; 1 <= g && 0 <= h; g--, h--) if (e2[g] !== f2[h]) {
        if (1 !== g || 1 !== h) {
          do
            if (g--, h--, 0 > h || e2[g] !== f2[h]) {
              var k2 = "\n" + e2[g].replace(" at new ", " at ");
              a2.displayName && k2.includes("<anonymous>") && (k2 = k2.replace("<anonymous>", a2.displayName));
              return k2;
            }
          while (1 <= g && 0 <= h);
        }
        break;
      }
    }
  } finally {
    Na = false, Error.prepareStackTrace = c2;
  }
  return (a2 = a2 ? a2.displayName || a2.name : "") ? Ma(a2) : "";
}
function Pa(a2) {
  switch (a2.tag) {
    case 5:
      return Ma(a2.type);
    case 16:
      return Ma("Lazy");
    case 13:
      return Ma("Suspense");
    case 19:
      return Ma("SuspenseList");
    case 0:
    case 2:
    case 15:
      return a2 = Oa(a2.type, false), a2;
    case 11:
      return a2 = Oa(a2.type.render, false), a2;
    case 1:
      return a2 = Oa(a2.type, true), a2;
    default:
      return "";
  }
}
function Qa(a2) {
  if (null == a2) return null;
  if ("function" === typeof a2) return a2.displayName || a2.name || null;
  if ("string" === typeof a2) return a2;
  switch (a2) {
    case ya:
      return "Fragment";
    case wa:
      return "Portal";
    case Aa:
      return "Profiler";
    case za:
      return "StrictMode";
    case Ea:
      return "Suspense";
    case Fa:
      return "SuspenseList";
  }
  if ("object" === typeof a2) switch (a2.$$typeof) {
    case Ca:
      return (a2.displayName || "Context") + ".Consumer";
    case Ba:
      return (a2._context.displayName || "Context") + ".Provider";
    case Da:
      var b = a2.render;
      a2 = a2.displayName;
      a2 || (a2 = b.displayName || b.name || "", a2 = "" !== a2 ? "ForwardRef(" + a2 + ")" : "ForwardRef");
      return a2;
    case Ga:
      return b = a2.displayName || null, null !== b ? b : Qa(a2.type) || "Memo";
    case Ha:
      b = a2._payload;
      a2 = a2._init;
      try {
        return Qa(a2(b));
      } catch (c2) {
      }
  }
  return null;
}
function Ra(a2) {
  var b = a2.type;
  switch (a2.tag) {
    case 24:
      return "Cache";
    case 9:
      return (b.displayName || "Context") + ".Consumer";
    case 10:
      return (b._context.displayName || "Context") + ".Provider";
    case 18:
      return "DehydratedFragment";
    case 11:
      return a2 = b.render, a2 = a2.displayName || a2.name || "", b.displayName || ("" !== a2 ? "ForwardRef(" + a2 + ")" : "ForwardRef");
    case 7:
      return "Fragment";
    case 5:
      return b;
    case 4:
      return "Portal";
    case 3:
      return "Root";
    case 6:
      return "Text";
    case 16:
      return Qa(b);
    case 8:
      return b === za ? "StrictMode" : "Mode";
    case 22:
      return "Offscreen";
    case 12:
      return "Profiler";
    case 21:
      return "Scope";
    case 13:
      return "Suspense";
    case 19:
      return "SuspenseList";
    case 25:
      return "TracingMarker";
    case 1:
    case 0:
    case 17:
    case 2:
    case 14:
    case 15:
      if ("function" === typeof b) return b.displayName || b.name || null;
      if ("string" === typeof b) return b;
  }
  return null;
}
function Sa(a2) {
  switch (typeof a2) {
    case "boolean":
    case "number":
    case "string":
    case "undefined":
      return a2;
    case "object":
      return a2;
    default:
      return "";
  }
}
function Ta(a2) {
  var b = a2.type;
  return (a2 = a2.nodeName) && "input" === a2.toLowerCase() && ("checkbox" === b || "radio" === b);
}
function Ua(a2) {
  var b = Ta(a2) ? "checked" : "value", c2 = Object.getOwnPropertyDescriptor(a2.constructor.prototype, b), d = "" + a2[b];
  if (!a2.hasOwnProperty(b) && "undefined" !== typeof c2 && "function" === typeof c2.get && "function" === typeof c2.set) {
    var e2 = c2.get, f2 = c2.set;
    Object.defineProperty(a2, b, { configurable: true, get: function() {
      return e2.call(this);
    }, set: function(a3) {
      d = "" + a3;
      f2.call(this, a3);
    } });
    Object.defineProperty(a2, b, { enumerable: c2.enumerable });
    return { getValue: function() {
      return d;
    }, setValue: function(a3) {
      d = "" + a3;
    }, stopTracking: function() {
      a2._valueTracker = null;
      delete a2[b];
    } };
  }
}
function Va(a2) {
  a2._valueTracker || (a2._valueTracker = Ua(a2));
}
function Wa(a2) {
  if (!a2) return false;
  var b = a2._valueTracker;
  if (!b) return true;
  var c2 = b.getValue();
  var d = "";
  a2 && (d = Ta(a2) ? a2.checked ? "true" : "false" : a2.value);
  a2 = d;
  return a2 !== c2 ? (b.setValue(a2), true) : false;
}
function Xa(a2) {
  a2 = a2 || ("undefined" !== typeof document ? document : void 0);
  if ("undefined" === typeof a2) return null;
  try {
    return a2.activeElement || a2.body;
  } catch (b) {
    return a2.body;
  }
}
function Ya(a2, b) {
  var c2 = b.checked;
  return A({}, b, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: null != c2 ? c2 : a2._wrapperState.initialChecked });
}
function Za(a2, b) {
  var c2 = null == b.defaultValue ? "" : b.defaultValue, d = null != b.checked ? b.checked : b.defaultChecked;
  c2 = Sa(null != b.value ? b.value : c2);
  a2._wrapperState = { initialChecked: d, initialValue: c2, controlled: "checkbox" === b.type || "radio" === b.type ? null != b.checked : null != b.value };
}
function ab(a2, b) {
  b = b.checked;
  null != b && ta(a2, "checked", b, false);
}
function bb(a2, b) {
  ab(a2, b);
  var c2 = Sa(b.value), d = b.type;
  if (null != c2) if ("number" === d) {
    if (0 === c2 && "" === a2.value || a2.value != c2) a2.value = "" + c2;
  } else a2.value !== "" + c2 && (a2.value = "" + c2);
  else if ("submit" === d || "reset" === d) {
    a2.removeAttribute("value");
    return;
  }
  b.hasOwnProperty("value") ? cb(a2, b.type, c2) : b.hasOwnProperty("defaultValue") && cb(a2, b.type, Sa(b.defaultValue));
  null == b.checked && null != b.defaultChecked && (a2.defaultChecked = !!b.defaultChecked);
}
function db(a2, b, c2) {
  if (b.hasOwnProperty("value") || b.hasOwnProperty("defaultValue")) {
    var d = b.type;
    if (!("submit" !== d && "reset" !== d || void 0 !== b.value && null !== b.value)) return;
    b = "" + a2._wrapperState.initialValue;
    c2 || b === a2.value || (a2.value = b);
    a2.defaultValue = b;
  }
  c2 = a2.name;
  "" !== c2 && (a2.name = "");
  a2.defaultChecked = !!a2._wrapperState.initialChecked;
  "" !== c2 && (a2.name = c2);
}
function cb(a2, b, c2) {
  if ("number" !== b || Xa(a2.ownerDocument) !== a2) null == c2 ? a2.defaultValue = "" + a2._wrapperState.initialValue : a2.defaultValue !== "" + c2 && (a2.defaultValue = "" + c2);
}
var eb = Array.isArray;
function fb(a2, b, c2, d) {
  a2 = a2.options;
  if (b) {
    b = {};
    for (var e2 = 0; e2 < c2.length; e2++) b["$" + c2[e2]] = true;
    for (c2 = 0; c2 < a2.length; c2++) e2 = b.hasOwnProperty("$" + a2[c2].value), a2[c2].selected !== e2 && (a2[c2].selected = e2), e2 && d && (a2[c2].defaultSelected = true);
  } else {
    c2 = "" + Sa(c2);
    b = null;
    for (e2 = 0; e2 < a2.length; e2++) {
      if (a2[e2].value === c2) {
        a2[e2].selected = true;
        d && (a2[e2].defaultSelected = true);
        return;
      }
      null !== b || a2[e2].disabled || (b = a2[e2]);
    }
    null !== b && (b.selected = true);
  }
}
function gb(a2, b) {
  if (null != b.dangerouslySetInnerHTML) throw Error(p$2(91));
  return A({}, b, { value: void 0, defaultValue: void 0, children: "" + a2._wrapperState.initialValue });
}
function hb(a2, b) {
  var c2 = b.value;
  if (null == c2) {
    c2 = b.children;
    b = b.defaultValue;
    if (null != c2) {
      if (null != b) throw Error(p$2(92));
      if (eb(c2)) {
        if (1 < c2.length) throw Error(p$2(93));
        c2 = c2[0];
      }
      b = c2;
    }
    null == b && (b = "");
    c2 = b;
  }
  a2._wrapperState = { initialValue: Sa(c2) };
}
function ib(a2, b) {
  var c2 = Sa(b.value), d = Sa(b.defaultValue);
  null != c2 && (c2 = "" + c2, c2 !== a2.value && (a2.value = c2), null == b.defaultValue && a2.defaultValue !== c2 && (a2.defaultValue = c2));
  null != d && (a2.defaultValue = "" + d);
}
function jb(a2) {
  var b = a2.textContent;
  b === a2._wrapperState.initialValue && "" !== b && null !== b && (a2.value = b);
}
function kb(a2) {
  switch (a2) {
    case "svg":
      return "http://www.w3.org/2000/svg";
    case "math":
      return "http://www.w3.org/1998/Math/MathML";
    default:
      return "http://www.w3.org/1999/xhtml";
  }
}
function lb(a2, b) {
  return null == a2 || "http://www.w3.org/1999/xhtml" === a2 ? kb(b) : "http://www.w3.org/2000/svg" === a2 && "foreignObject" === b ? "http://www.w3.org/1999/xhtml" : a2;
}
var mb, nb = function(a2) {
  return "undefined" !== typeof MSApp && MSApp.execUnsafeLocalFunction ? function(b, c2, d, e2) {
    MSApp.execUnsafeLocalFunction(function() {
      return a2(b, c2, d, e2);
    });
  } : a2;
}(function(a2, b) {
  if ("http://www.w3.org/2000/svg" !== a2.namespaceURI || "innerHTML" in a2) a2.innerHTML = b;
  else {
    mb = mb || document.createElement("div");
    mb.innerHTML = "<svg>" + b.valueOf().toString() + "</svg>";
    for (b = mb.firstChild; a2.firstChild; ) a2.removeChild(a2.firstChild);
    for (; b.firstChild; ) a2.appendChild(b.firstChild);
  }
});
function ob(a2, b) {
  if (b) {
    var c2 = a2.firstChild;
    if (c2 && c2 === a2.lastChild && 3 === c2.nodeType) {
      c2.nodeValue = b;
      return;
    }
  }
  a2.textContent = b;
}
var pb = {
  animationIterationCount: true,
  aspectRatio: true,
  borderImageOutset: true,
  borderImageSlice: true,
  borderImageWidth: true,
  boxFlex: true,
  boxFlexGroup: true,
  boxOrdinalGroup: true,
  columnCount: true,
  columns: true,
  flex: true,
  flexGrow: true,
  flexPositive: true,
  flexShrink: true,
  flexNegative: true,
  flexOrder: true,
  gridArea: true,
  gridRow: true,
  gridRowEnd: true,
  gridRowSpan: true,
  gridRowStart: true,
  gridColumn: true,
  gridColumnEnd: true,
  gridColumnSpan: true,
  gridColumnStart: true,
  fontWeight: true,
  lineClamp: true,
  lineHeight: true,
  opacity: true,
  order: true,
  orphans: true,
  tabSize: true,
  widows: true,
  zIndex: true,
  zoom: true,
  fillOpacity: true,
  floodOpacity: true,
  stopOpacity: true,
  strokeDasharray: true,
  strokeDashoffset: true,
  strokeMiterlimit: true,
  strokeOpacity: true,
  strokeWidth: true
}, qb = ["Webkit", "ms", "Moz", "O"];
Object.keys(pb).forEach(function(a2) {
  qb.forEach(function(b) {
    b = b + a2.charAt(0).toUpperCase() + a2.substring(1);
    pb[b] = pb[a2];
  });
});
function rb(a2, b, c2) {
  return null == b || "boolean" === typeof b || "" === b ? "" : c2 || "number" !== typeof b || 0 === b || pb.hasOwnProperty(a2) && pb[a2] ? ("" + b).trim() : b + "px";
}
function sb(a2, b) {
  a2 = a2.style;
  for (var c2 in b) if (b.hasOwnProperty(c2)) {
    var d = 0 === c2.indexOf("--"), e2 = rb(c2, b[c2], d);
    "float" === c2 && (c2 = "cssFloat");
    d ? a2.setProperty(c2, e2) : a2[c2] = e2;
  }
}
var tb = A({ menuitem: true }, { area: true, base: true, br: true, col: true, embed: true, hr: true, img: true, input: true, keygen: true, link: true, meta: true, param: true, source: true, track: true, wbr: true });
function ub(a2, b) {
  if (b) {
    if (tb[a2] && (null != b.children || null != b.dangerouslySetInnerHTML)) throw Error(p$2(137, a2));
    if (null != b.dangerouslySetInnerHTML) {
      if (null != b.children) throw Error(p$2(60));
      if ("object" !== typeof b.dangerouslySetInnerHTML || !("__html" in b.dangerouslySetInnerHTML)) throw Error(p$2(61));
    }
    if (null != b.style && "object" !== typeof b.style) throw Error(p$2(62));
  }
}
function vb(a2, b) {
  if (-1 === a2.indexOf("-")) return "string" === typeof b.is;
  switch (a2) {
    case "annotation-xml":
    case "color-profile":
    case "font-face":
    case "font-face-src":
    case "font-face-uri":
    case "font-face-format":
    case "font-face-name":
    case "missing-glyph":
      return false;
    default:
      return true;
  }
}
var wb = null;
function xb(a2) {
  a2 = a2.target || a2.srcElement || window;
  a2.correspondingUseElement && (a2 = a2.correspondingUseElement);
  return 3 === a2.nodeType ? a2.parentNode : a2;
}
var yb = null, zb = null, Ab = null;
function Bb(a2) {
  if (a2 = Cb(a2)) {
    if ("function" !== typeof yb) throw Error(p$2(280));
    var b = a2.stateNode;
    b && (b = Db(b), yb(a2.stateNode, a2.type, b));
  }
}
function Eb(a2) {
  zb ? Ab ? Ab.push(a2) : Ab = [a2] : zb = a2;
}
function Fb() {
  if (zb) {
    var a2 = zb, b = Ab;
    Ab = zb = null;
    Bb(a2);
    if (b) for (a2 = 0; a2 < b.length; a2++) Bb(b[a2]);
  }
}
function Gb(a2, b) {
  return a2(b);
}
function Hb() {
}
var Ib = false;
function Jb(a2, b, c2) {
  if (Ib) return a2(b, c2);
  Ib = true;
  try {
    return Gb(a2, b, c2);
  } finally {
    if (Ib = false, null !== zb || null !== Ab) Hb(), Fb();
  }
}
function Kb(a2, b) {
  var c2 = a2.stateNode;
  if (null === c2) return null;
  var d = Db(c2);
  if (null === d) return null;
  c2 = d[b];
  a: switch (b) {
    case "onClick":
    case "onClickCapture":
    case "onDoubleClick":
    case "onDoubleClickCapture":
    case "onMouseDown":
    case "onMouseDownCapture":
    case "onMouseMove":
    case "onMouseMoveCapture":
    case "onMouseUp":
    case "onMouseUpCapture":
    case "onMouseEnter":
      (d = !d.disabled) || (a2 = a2.type, d = !("button" === a2 || "input" === a2 || "select" === a2 || "textarea" === a2));
      a2 = !d;
      break a;
    default:
      a2 = false;
  }
  if (a2) return null;
  if (c2 && "function" !== typeof c2) throw Error(p$2(231, b, typeof c2));
  return c2;
}
var Lb = false;
if (ia) try {
  var Mb = {};
  Object.defineProperty(Mb, "passive", { get: function() {
    Lb = true;
  } });
  window.addEventListener("test", Mb, Mb);
  window.removeEventListener("test", Mb, Mb);
} catch (a2) {
  Lb = false;
}
function Nb(a2, b, c2, d, e2, f2, g, h, k2) {
  var l2 = Array.prototype.slice.call(arguments, 3);
  try {
    b.apply(c2, l2);
  } catch (m2) {
    this.onError(m2);
  }
}
var Ob = false, Pb = null, Qb = false, Rb = null, Sb = { onError: function(a2) {
  Ob = true;
  Pb = a2;
} };
function Tb(a2, b, c2, d, e2, f2, g, h, k2) {
  Ob = false;
  Pb = null;
  Nb.apply(Sb, arguments);
}
function Ub(a2, b, c2, d, e2, f2, g, h, k2) {
  Tb.apply(this, arguments);
  if (Ob) {
    if (Ob) {
      var l2 = Pb;
      Ob = false;
      Pb = null;
    } else throw Error(p$2(198));
    Qb || (Qb = true, Rb = l2);
  }
}
function Vb(a2) {
  var b = a2, c2 = a2;
  if (a2.alternate) for (; b.return; ) b = b.return;
  else {
    a2 = b;
    do
      b = a2, 0 !== (b.flags & 4098) && (c2 = b.return), a2 = b.return;
    while (a2);
  }
  return 3 === b.tag ? c2 : null;
}
function Wb(a2) {
  if (13 === a2.tag) {
    var b = a2.memoizedState;
    null === b && (a2 = a2.alternate, null !== a2 && (b = a2.memoizedState));
    if (null !== b) return b.dehydrated;
  }
  return null;
}
function Xb(a2) {
  if (Vb(a2) !== a2) throw Error(p$2(188));
}
function Yb(a2) {
  var b = a2.alternate;
  if (!b) {
    b = Vb(a2);
    if (null === b) throw Error(p$2(188));
    return b !== a2 ? null : a2;
  }
  for (var c2 = a2, d = b; ; ) {
    var e2 = c2.return;
    if (null === e2) break;
    var f2 = e2.alternate;
    if (null === f2) {
      d = e2.return;
      if (null !== d) {
        c2 = d;
        continue;
      }
      break;
    }
    if (e2.child === f2.child) {
      for (f2 = e2.child; f2; ) {
        if (f2 === c2) return Xb(e2), a2;
        if (f2 === d) return Xb(e2), b;
        f2 = f2.sibling;
      }
      throw Error(p$2(188));
    }
    if (c2.return !== d.return) c2 = e2, d = f2;
    else {
      for (var g = false, h = e2.child; h; ) {
        if (h === c2) {
          g = true;
          c2 = e2;
          d = f2;
          break;
        }
        if (h === d) {
          g = true;
          d = e2;
          c2 = f2;
          break;
        }
        h = h.sibling;
      }
      if (!g) {
        for (h = f2.child; h; ) {
          if (h === c2) {
            g = true;
            c2 = f2;
            d = e2;
            break;
          }
          if (h === d) {
            g = true;
            d = f2;
            c2 = e2;
            break;
          }
          h = h.sibling;
        }
        if (!g) throw Error(p$2(189));
      }
    }
    if (c2.alternate !== d) throw Error(p$2(190));
  }
  if (3 !== c2.tag) throw Error(p$2(188));
  return c2.stateNode.current === c2 ? a2 : b;
}
function Zb(a2) {
  a2 = Yb(a2);
  return null !== a2 ? $b(a2) : null;
}
function $b(a2) {
  if (5 === a2.tag || 6 === a2.tag) return a2;
  for (a2 = a2.child; null !== a2; ) {
    var b = $b(a2);
    if (null !== b) return b;
    a2 = a2.sibling;
  }
  return null;
}
var ac = ca.unstable_scheduleCallback, bc = ca.unstable_cancelCallback, cc = ca.unstable_shouldYield, dc = ca.unstable_requestPaint, B = ca.unstable_now, ec = ca.unstable_getCurrentPriorityLevel, fc = ca.unstable_ImmediatePriority, gc = ca.unstable_UserBlockingPriority, hc = ca.unstable_NormalPriority, ic = ca.unstable_LowPriority, jc = ca.unstable_IdlePriority, kc = null, lc = null;
function mc(a2) {
  if (lc && "function" === typeof lc.onCommitFiberRoot) try {
    lc.onCommitFiberRoot(kc, a2, void 0, 128 === (a2.current.flags & 128));
  } catch (b) {
  }
}
var oc = Math.clz32 ? Math.clz32 : nc, pc = Math.log, qc = Math.LN2;
function nc(a2) {
  a2 >>>= 0;
  return 0 === a2 ? 32 : 31 - (pc(a2) / qc | 0) | 0;
}
var rc = 64, sc = 4194304;
function tc(a2) {
  switch (a2 & -a2) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 4:
      return 4;
    case 8:
      return 8;
    case 16:
      return 16;
    case 32:
      return 32;
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return a2 & 4194240;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return a2 & 130023424;
    case 134217728:
      return 134217728;
    case 268435456:
      return 268435456;
    case 536870912:
      return 536870912;
    case 1073741824:
      return 1073741824;
    default:
      return a2;
  }
}
function uc(a2, b) {
  var c2 = a2.pendingLanes;
  if (0 === c2) return 0;
  var d = 0, e2 = a2.suspendedLanes, f2 = a2.pingedLanes, g = c2 & 268435455;
  if (0 !== g) {
    var h = g & ~e2;
    0 !== h ? d = tc(h) : (f2 &= g, 0 !== f2 && (d = tc(f2)));
  } else g = c2 & ~e2, 0 !== g ? d = tc(g) : 0 !== f2 && (d = tc(f2));
  if (0 === d) return 0;
  if (0 !== b && b !== d && 0 === (b & e2) && (e2 = d & -d, f2 = b & -b, e2 >= f2 || 16 === e2 && 0 !== (f2 & 4194240))) return b;
  0 !== (d & 4) && (d |= c2 & 16);
  b = a2.entangledLanes;
  if (0 !== b) for (a2 = a2.entanglements, b &= d; 0 < b; ) c2 = 31 - oc(b), e2 = 1 << c2, d |= a2[c2], b &= ~e2;
  return d;
}
function vc(a2, b) {
  switch (a2) {
    case 1:
    case 2:
    case 4:
      return b + 250;
    case 8:
    case 16:
    case 32:
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return b + 5e3;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return -1;
    case 134217728:
    case 268435456:
    case 536870912:
    case 1073741824:
      return -1;
    default:
      return -1;
  }
}
function wc(a2, b) {
  for (var c2 = a2.suspendedLanes, d = a2.pingedLanes, e2 = a2.expirationTimes, f2 = a2.pendingLanes; 0 < f2; ) {
    var g = 31 - oc(f2), h = 1 << g, k2 = e2[g];
    if (-1 === k2) {
      if (0 === (h & c2) || 0 !== (h & d)) e2[g] = vc(h, b);
    } else k2 <= b && (a2.expiredLanes |= h);
    f2 &= ~h;
  }
}
function xc(a2) {
  a2 = a2.pendingLanes & -1073741825;
  return 0 !== a2 ? a2 : a2 & 1073741824 ? 1073741824 : 0;
}
function yc() {
  var a2 = rc;
  rc <<= 1;
  0 === (rc & 4194240) && (rc = 64);
  return a2;
}
function zc(a2) {
  for (var b = [], c2 = 0; 31 > c2; c2++) b.push(a2);
  return b;
}
function Ac(a2, b, c2) {
  a2.pendingLanes |= b;
  536870912 !== b && (a2.suspendedLanes = 0, a2.pingedLanes = 0);
  a2 = a2.eventTimes;
  b = 31 - oc(b);
  a2[b] = c2;
}
function Bc(a2, b) {
  var c2 = a2.pendingLanes & ~b;
  a2.pendingLanes = b;
  a2.suspendedLanes = 0;
  a2.pingedLanes = 0;
  a2.expiredLanes &= b;
  a2.mutableReadLanes &= b;
  a2.entangledLanes &= b;
  b = a2.entanglements;
  var d = a2.eventTimes;
  for (a2 = a2.expirationTimes; 0 < c2; ) {
    var e2 = 31 - oc(c2), f2 = 1 << e2;
    b[e2] = 0;
    d[e2] = -1;
    a2[e2] = -1;
    c2 &= ~f2;
  }
}
function Cc(a2, b) {
  var c2 = a2.entangledLanes |= b;
  for (a2 = a2.entanglements; c2; ) {
    var d = 31 - oc(c2), e2 = 1 << d;
    e2 & b | a2[d] & b && (a2[d] |= b);
    c2 &= ~e2;
  }
}
var C = 0;
function Dc(a2) {
  a2 &= -a2;
  return 1 < a2 ? 4 < a2 ? 0 !== (a2 & 268435455) ? 16 : 536870912 : 4 : 1;
}
var Ec, Fc, Gc, Hc, Ic, Jc = false, Kc = [], Lc = null, Mc = null, Nc = null, Oc = /* @__PURE__ */ new Map(), Pc = /* @__PURE__ */ new Map(), Qc = [], Rc = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
function Sc(a2, b) {
  switch (a2) {
    case "focusin":
    case "focusout":
      Lc = null;
      break;
    case "dragenter":
    case "dragleave":
      Mc = null;
      break;
    case "mouseover":
    case "mouseout":
      Nc = null;
      break;
    case "pointerover":
    case "pointerout":
      Oc.delete(b.pointerId);
      break;
    case "gotpointercapture":
    case "lostpointercapture":
      Pc.delete(b.pointerId);
  }
}
function Tc(a2, b, c2, d, e2, f2) {
  if (null === a2 || a2.nativeEvent !== f2) return a2 = { blockedOn: b, domEventName: c2, eventSystemFlags: d, nativeEvent: f2, targetContainers: [e2] }, null !== b && (b = Cb(b), null !== b && Fc(b)), a2;
  a2.eventSystemFlags |= d;
  b = a2.targetContainers;
  null !== e2 && -1 === b.indexOf(e2) && b.push(e2);
  return a2;
}
function Uc(a2, b, c2, d, e2) {
  switch (b) {
    case "focusin":
      return Lc = Tc(Lc, a2, b, c2, d, e2), true;
    case "dragenter":
      return Mc = Tc(Mc, a2, b, c2, d, e2), true;
    case "mouseover":
      return Nc = Tc(Nc, a2, b, c2, d, e2), true;
    case "pointerover":
      var f2 = e2.pointerId;
      Oc.set(f2, Tc(Oc.get(f2) || null, a2, b, c2, d, e2));
      return true;
    case "gotpointercapture":
      return f2 = e2.pointerId, Pc.set(f2, Tc(Pc.get(f2) || null, a2, b, c2, d, e2)), true;
  }
  return false;
}
function Vc(a2) {
  var b = Wc(a2.target);
  if (null !== b) {
    var c2 = Vb(b);
    if (null !== c2) {
      if (b = c2.tag, 13 === b) {
        if (b = Wb(c2), null !== b) {
          a2.blockedOn = b;
          Ic(a2.priority, function() {
            Gc(c2);
          });
          return;
        }
      } else if (3 === b && c2.stateNode.current.memoizedState.isDehydrated) {
        a2.blockedOn = 3 === c2.tag ? c2.stateNode.containerInfo : null;
        return;
      }
    }
  }
  a2.blockedOn = null;
}
function Xc(a2) {
  if (null !== a2.blockedOn) return false;
  for (var b = a2.targetContainers; 0 < b.length; ) {
    var c2 = Yc(a2.domEventName, a2.eventSystemFlags, b[0], a2.nativeEvent);
    if (null === c2) {
      c2 = a2.nativeEvent;
      var d = new c2.constructor(c2.type, c2);
      wb = d;
      c2.target.dispatchEvent(d);
      wb = null;
    } else return b = Cb(c2), null !== b && Fc(b), a2.blockedOn = c2, false;
    b.shift();
  }
  return true;
}
function Zc(a2, b, c2) {
  Xc(a2) && c2.delete(b);
}
function $c() {
  Jc = false;
  null !== Lc && Xc(Lc) && (Lc = null);
  null !== Mc && Xc(Mc) && (Mc = null);
  null !== Nc && Xc(Nc) && (Nc = null);
  Oc.forEach(Zc);
  Pc.forEach(Zc);
}
function ad(a2, b) {
  a2.blockedOn === b && (a2.blockedOn = null, Jc || (Jc = true, ca.unstable_scheduleCallback(ca.unstable_NormalPriority, $c)));
}
function bd(a2) {
  function b(b2) {
    return ad(b2, a2);
  }
  if (0 < Kc.length) {
    ad(Kc[0], a2);
    for (var c2 = 1; c2 < Kc.length; c2++) {
      var d = Kc[c2];
      d.blockedOn === a2 && (d.blockedOn = null);
    }
  }
  null !== Lc && ad(Lc, a2);
  null !== Mc && ad(Mc, a2);
  null !== Nc && ad(Nc, a2);
  Oc.forEach(b);
  Pc.forEach(b);
  for (c2 = 0; c2 < Qc.length; c2++) d = Qc[c2], d.blockedOn === a2 && (d.blockedOn = null);
  for (; 0 < Qc.length && (c2 = Qc[0], null === c2.blockedOn); ) Vc(c2), null === c2.blockedOn && Qc.shift();
}
var cd = ua.ReactCurrentBatchConfig, dd = true;
function ed(a2, b, c2, d) {
  var e2 = C, f2 = cd.transition;
  cd.transition = null;
  try {
    C = 1, fd(a2, b, c2, d);
  } finally {
    C = e2, cd.transition = f2;
  }
}
function gd(a2, b, c2, d) {
  var e2 = C, f2 = cd.transition;
  cd.transition = null;
  try {
    C = 4, fd(a2, b, c2, d);
  } finally {
    C = e2, cd.transition = f2;
  }
}
function fd(a2, b, c2, d) {
  if (dd) {
    var e2 = Yc(a2, b, c2, d);
    if (null === e2) hd(a2, b, d, id, c2), Sc(a2, d);
    else if (Uc(e2, a2, b, c2, d)) d.stopPropagation();
    else if (Sc(a2, d), b & 4 && -1 < Rc.indexOf(a2)) {
      for (; null !== e2; ) {
        var f2 = Cb(e2);
        null !== f2 && Ec(f2);
        f2 = Yc(a2, b, c2, d);
        null === f2 && hd(a2, b, d, id, c2);
        if (f2 === e2) break;
        e2 = f2;
      }
      null !== e2 && d.stopPropagation();
    } else hd(a2, b, d, null, c2);
  }
}
var id = null;
function Yc(a2, b, c2, d) {
  id = null;
  a2 = xb(d);
  a2 = Wc(a2);
  if (null !== a2) if (b = Vb(a2), null === b) a2 = null;
  else if (c2 = b.tag, 13 === c2) {
    a2 = Wb(b);
    if (null !== a2) return a2;
    a2 = null;
  } else if (3 === c2) {
    if (b.stateNode.current.memoizedState.isDehydrated) return 3 === b.tag ? b.stateNode.containerInfo : null;
    a2 = null;
  } else b !== a2 && (a2 = null);
  id = a2;
  return null;
}
function jd(a2) {
  switch (a2) {
    case "cancel":
    case "click":
    case "close":
    case "contextmenu":
    case "copy":
    case "cut":
    case "auxclick":
    case "dblclick":
    case "dragend":
    case "dragstart":
    case "drop":
    case "focusin":
    case "focusout":
    case "input":
    case "invalid":
    case "keydown":
    case "keypress":
    case "keyup":
    case "mousedown":
    case "mouseup":
    case "paste":
    case "pause":
    case "play":
    case "pointercancel":
    case "pointerdown":
    case "pointerup":
    case "ratechange":
    case "reset":
    case "resize":
    case "seeked":
    case "submit":
    case "touchcancel":
    case "touchend":
    case "touchstart":
    case "volumechange":
    case "change":
    case "selectionchange":
    case "textInput":
    case "compositionstart":
    case "compositionend":
    case "compositionupdate":
    case "beforeblur":
    case "afterblur":
    case "beforeinput":
    case "blur":
    case "fullscreenchange":
    case "focus":
    case "hashchange":
    case "popstate":
    case "select":
    case "selectstart":
      return 1;
    case "drag":
    case "dragenter":
    case "dragexit":
    case "dragleave":
    case "dragover":
    case "mousemove":
    case "mouseout":
    case "mouseover":
    case "pointermove":
    case "pointerout":
    case "pointerover":
    case "scroll":
    case "toggle":
    case "touchmove":
    case "wheel":
    case "mouseenter":
    case "mouseleave":
    case "pointerenter":
    case "pointerleave":
      return 4;
    case "message":
      switch (ec()) {
        case fc:
          return 1;
        case gc:
          return 4;
        case hc:
        case ic:
          return 16;
        case jc:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var kd = null, ld = null, md = null;
function nd() {
  if (md) return md;
  var a2, b = ld, c2 = b.length, d, e2 = "value" in kd ? kd.value : kd.textContent, f2 = e2.length;
  for (a2 = 0; a2 < c2 && b[a2] === e2[a2]; a2++) ;
  var g = c2 - a2;
  for (d = 1; d <= g && b[c2 - d] === e2[f2 - d]; d++) ;
  return md = e2.slice(a2, 1 < d ? 1 - d : void 0);
}
function od(a2) {
  var b = a2.keyCode;
  "charCode" in a2 ? (a2 = a2.charCode, 0 === a2 && 13 === b && (a2 = 13)) : a2 = b;
  10 === a2 && (a2 = 13);
  return 32 <= a2 || 13 === a2 ? a2 : 0;
}
function pd() {
  return true;
}
function qd() {
  return false;
}
function rd(a2) {
  function b(b2, d, e2, f2, g) {
    this._reactName = b2;
    this._targetInst = e2;
    this.type = d;
    this.nativeEvent = f2;
    this.target = g;
    this.currentTarget = null;
    for (var c2 in a2) a2.hasOwnProperty(c2) && (b2 = a2[c2], this[c2] = b2 ? b2(f2) : f2[c2]);
    this.isDefaultPrevented = (null != f2.defaultPrevented ? f2.defaultPrevented : false === f2.returnValue) ? pd : qd;
    this.isPropagationStopped = qd;
    return this;
  }
  A(b.prototype, { preventDefault: function() {
    this.defaultPrevented = true;
    var a3 = this.nativeEvent;
    a3 && (a3.preventDefault ? a3.preventDefault() : "unknown" !== typeof a3.returnValue && (a3.returnValue = false), this.isDefaultPrevented = pd);
  }, stopPropagation: function() {
    var a3 = this.nativeEvent;
    a3 && (a3.stopPropagation ? a3.stopPropagation() : "unknown" !== typeof a3.cancelBubble && (a3.cancelBubble = true), this.isPropagationStopped = pd);
  }, persist: function() {
  }, isPersistent: pd });
  return b;
}
var sd = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(a2) {
  return a2.timeStamp || Date.now();
}, defaultPrevented: 0, isTrusted: 0 }, td = rd(sd), ud = A({}, sd, { view: 0, detail: 0 }), vd = rd(ud), wd, xd, yd, Ad = A({}, ud, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: zd, button: 0, buttons: 0, relatedTarget: function(a2) {
  return void 0 === a2.relatedTarget ? a2.fromElement === a2.srcElement ? a2.toElement : a2.fromElement : a2.relatedTarget;
}, movementX: function(a2) {
  if ("movementX" in a2) return a2.movementX;
  a2 !== yd && (yd && "mousemove" === a2.type ? (wd = a2.screenX - yd.screenX, xd = a2.screenY - yd.screenY) : xd = wd = 0, yd = a2);
  return wd;
}, movementY: function(a2) {
  return "movementY" in a2 ? a2.movementY : xd;
} }), Bd = rd(Ad), Cd = A({}, Ad, { dataTransfer: 0 }), Dd = rd(Cd), Ed = A({}, ud, { relatedTarget: 0 }), Fd = rd(Ed), Gd = A({}, sd, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), Hd = rd(Gd), Id = A({}, sd, { clipboardData: function(a2) {
  return "clipboardData" in a2 ? a2.clipboardData : window.clipboardData;
} }), Jd = rd(Id), Kd = A({}, sd, { data: 0 }), Ld = rd(Kd), Md = {
  Esc: "Escape",
  Spacebar: " ",
  Left: "ArrowLeft",
  Up: "ArrowUp",
  Right: "ArrowRight",
  Down: "ArrowDown",
  Del: "Delete",
  Win: "OS",
  Menu: "ContextMenu",
  Apps: "ContextMenu",
  Scroll: "ScrollLock",
  MozPrintableKey: "Unidentified"
}, Nd = {
  8: "Backspace",
  9: "Tab",
  12: "Clear",
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  19: "Pause",
  20: "CapsLock",
  27: "Escape",
  32: " ",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  45: "Insert",
  46: "Delete",
  112: "F1",
  113: "F2",
  114: "F3",
  115: "F4",
  116: "F5",
  117: "F6",
  118: "F7",
  119: "F8",
  120: "F9",
  121: "F10",
  122: "F11",
  123: "F12",
  144: "NumLock",
  145: "ScrollLock",
  224: "Meta"
}, Od = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
function Pd(a2) {
  var b = this.nativeEvent;
  return b.getModifierState ? b.getModifierState(a2) : (a2 = Od[a2]) ? !!b[a2] : false;
}
function zd() {
  return Pd;
}
var Qd = A({}, ud, { key: function(a2) {
  if (a2.key) {
    var b = Md[a2.key] || a2.key;
    if ("Unidentified" !== b) return b;
  }
  return "keypress" === a2.type ? (a2 = od(a2), 13 === a2 ? "Enter" : String.fromCharCode(a2)) : "keydown" === a2.type || "keyup" === a2.type ? Nd[a2.keyCode] || "Unidentified" : "";
}, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: zd, charCode: function(a2) {
  return "keypress" === a2.type ? od(a2) : 0;
}, keyCode: function(a2) {
  return "keydown" === a2.type || "keyup" === a2.type ? a2.keyCode : 0;
}, which: function(a2) {
  return "keypress" === a2.type ? od(a2) : "keydown" === a2.type || "keyup" === a2.type ? a2.keyCode : 0;
} }), Rd = rd(Qd), Sd = A({}, Ad, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Td = rd(Sd), Ud = A({}, ud, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: zd }), Vd = rd(Ud), Wd = A({}, sd, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Xd = rd(Wd), Yd = A({}, Ad, {
  deltaX: function(a2) {
    return "deltaX" in a2 ? a2.deltaX : "wheelDeltaX" in a2 ? -a2.wheelDeltaX : 0;
  },
  deltaY: function(a2) {
    return "deltaY" in a2 ? a2.deltaY : "wheelDeltaY" in a2 ? -a2.wheelDeltaY : "wheelDelta" in a2 ? -a2.wheelDelta : 0;
  },
  deltaZ: 0,
  deltaMode: 0
}), Zd = rd(Yd), $d = [9, 13, 27, 32], ae = ia && "CompositionEvent" in window, be = null;
ia && "documentMode" in document && (be = document.documentMode);
var ce = ia && "TextEvent" in window && !be, de = ia && (!ae || be && 8 < be && 11 >= be), ee = String.fromCharCode(32), fe = false;
function ge(a2, b) {
  switch (a2) {
    case "keyup":
      return -1 !== $d.indexOf(b.keyCode);
    case "keydown":
      return 229 !== b.keyCode;
    case "keypress":
    case "mousedown":
    case "focusout":
      return true;
    default:
      return false;
  }
}
function he(a2) {
  a2 = a2.detail;
  return "object" === typeof a2 && "data" in a2 ? a2.data : null;
}
var ie = false;
function je(a2, b) {
  switch (a2) {
    case "compositionend":
      return he(b);
    case "keypress":
      if (32 !== b.which) return null;
      fe = true;
      return ee;
    case "textInput":
      return a2 = b.data, a2 === ee && fe ? null : a2;
    default:
      return null;
  }
}
function ke(a2, b) {
  if (ie) return "compositionend" === a2 || !ae && ge(a2, b) ? (a2 = nd(), md = ld = kd = null, ie = false, a2) : null;
  switch (a2) {
    case "paste":
      return null;
    case "keypress":
      if (!(b.ctrlKey || b.altKey || b.metaKey) || b.ctrlKey && b.altKey) {
        if (b.char && 1 < b.char.length) return b.char;
        if (b.which) return String.fromCharCode(b.which);
      }
      return null;
    case "compositionend":
      return de && "ko" !== b.locale ? null : b.data;
    default:
      return null;
  }
}
var le = { color: true, date: true, datetime: true, "datetime-local": true, email: true, month: true, number: true, password: true, range: true, search: true, tel: true, text: true, time: true, url: true, week: true };
function me(a2) {
  var b = a2 && a2.nodeName && a2.nodeName.toLowerCase();
  return "input" === b ? !!le[a2.type] : "textarea" === b ? true : false;
}
function ne(a2, b, c2, d) {
  Eb(d);
  b = oe(b, "onChange");
  0 < b.length && (c2 = new td("onChange", "change", null, c2, d), a2.push({ event: c2, listeners: b }));
}
var pe = null, qe = null;
function re(a2) {
  se(a2, 0);
}
function te(a2) {
  var b = ue(a2);
  if (Wa(b)) return a2;
}
function ve(a2, b) {
  if ("change" === a2) return b;
}
var we = false;
if (ia) {
  var xe;
  if (ia) {
    var ye = "oninput" in document;
    if (!ye) {
      var ze = document.createElement("div");
      ze.setAttribute("oninput", "return;");
      ye = "function" === typeof ze.oninput;
    }
    xe = ye;
  } else xe = false;
  we = xe && (!document.documentMode || 9 < document.documentMode);
}
function Ae() {
  pe && (pe.detachEvent("onpropertychange", Be), qe = pe = null);
}
function Be(a2) {
  if ("value" === a2.propertyName && te(qe)) {
    var b = [];
    ne(b, qe, a2, xb(a2));
    Jb(re, b);
  }
}
function Ce(a2, b, c2) {
  "focusin" === a2 ? (Ae(), pe = b, qe = c2, pe.attachEvent("onpropertychange", Be)) : "focusout" === a2 && Ae();
}
function De(a2) {
  if ("selectionchange" === a2 || "keyup" === a2 || "keydown" === a2) return te(qe);
}
function Ee(a2, b) {
  if ("click" === a2) return te(b);
}
function Fe(a2, b) {
  if ("input" === a2 || "change" === a2) return te(b);
}
function Ge(a2, b) {
  return a2 === b && (0 !== a2 || 1 / a2 === 1 / b) || a2 !== a2 && b !== b;
}
var He = "function" === typeof Object.is ? Object.is : Ge;
function Ie(a2, b) {
  if (He(a2, b)) return true;
  if ("object" !== typeof a2 || null === a2 || "object" !== typeof b || null === b) return false;
  var c2 = Object.keys(a2), d = Object.keys(b);
  if (c2.length !== d.length) return false;
  for (d = 0; d < c2.length; d++) {
    var e2 = c2[d];
    if (!ja.call(b, e2) || !He(a2[e2], b[e2])) return false;
  }
  return true;
}
function Je(a2) {
  for (; a2 && a2.firstChild; ) a2 = a2.firstChild;
  return a2;
}
function Ke(a2, b) {
  var c2 = Je(a2);
  a2 = 0;
  for (var d; c2; ) {
    if (3 === c2.nodeType) {
      d = a2 + c2.textContent.length;
      if (a2 <= b && d >= b) return { node: c2, offset: b - a2 };
      a2 = d;
    }
    a: {
      for (; c2; ) {
        if (c2.nextSibling) {
          c2 = c2.nextSibling;
          break a;
        }
        c2 = c2.parentNode;
      }
      c2 = void 0;
    }
    c2 = Je(c2);
  }
}
function Le(a2, b) {
  return a2 && b ? a2 === b ? true : a2 && 3 === a2.nodeType ? false : b && 3 === b.nodeType ? Le(a2, b.parentNode) : "contains" in a2 ? a2.contains(b) : a2.compareDocumentPosition ? !!(a2.compareDocumentPosition(b) & 16) : false : false;
}
function Me() {
  for (var a2 = window, b = Xa(); b instanceof a2.HTMLIFrameElement; ) {
    try {
      var c2 = "string" === typeof b.contentWindow.location.href;
    } catch (d) {
      c2 = false;
    }
    if (c2) a2 = b.contentWindow;
    else break;
    b = Xa(a2.document);
  }
  return b;
}
function Ne(a2) {
  var b = a2 && a2.nodeName && a2.nodeName.toLowerCase();
  return b && ("input" === b && ("text" === a2.type || "search" === a2.type || "tel" === a2.type || "url" === a2.type || "password" === a2.type) || "textarea" === b || "true" === a2.contentEditable);
}
function Oe(a2) {
  var b = Me(), c2 = a2.focusedElem, d = a2.selectionRange;
  if (b !== c2 && c2 && c2.ownerDocument && Le(c2.ownerDocument.documentElement, c2)) {
    if (null !== d && Ne(c2)) {
      if (b = d.start, a2 = d.end, void 0 === a2 && (a2 = b), "selectionStart" in c2) c2.selectionStart = b, c2.selectionEnd = Math.min(a2, c2.value.length);
      else if (a2 = (b = c2.ownerDocument || document) && b.defaultView || window, a2.getSelection) {
        a2 = a2.getSelection();
        var e2 = c2.textContent.length, f2 = Math.min(d.start, e2);
        d = void 0 === d.end ? f2 : Math.min(d.end, e2);
        !a2.extend && f2 > d && (e2 = d, d = f2, f2 = e2);
        e2 = Ke(c2, f2);
        var g = Ke(
          c2,
          d
        );
        e2 && g && (1 !== a2.rangeCount || a2.anchorNode !== e2.node || a2.anchorOffset !== e2.offset || a2.focusNode !== g.node || a2.focusOffset !== g.offset) && (b = b.createRange(), b.setStart(e2.node, e2.offset), a2.removeAllRanges(), f2 > d ? (a2.addRange(b), a2.extend(g.node, g.offset)) : (b.setEnd(g.node, g.offset), a2.addRange(b)));
      }
    }
    b = [];
    for (a2 = c2; a2 = a2.parentNode; ) 1 === a2.nodeType && b.push({ element: a2, left: a2.scrollLeft, top: a2.scrollTop });
    "function" === typeof c2.focus && c2.focus();
    for (c2 = 0; c2 < b.length; c2++) a2 = b[c2], a2.element.scrollLeft = a2.left, a2.element.scrollTop = a2.top;
  }
}
var Pe = ia && "documentMode" in document && 11 >= document.documentMode, Qe = null, Re = null, Se = null, Te = false;
function Ue(a2, b, c2) {
  var d = c2.window === c2 ? c2.document : 9 === c2.nodeType ? c2 : c2.ownerDocument;
  Te || null == Qe || Qe !== Xa(d) || (d = Qe, "selectionStart" in d && Ne(d) ? d = { start: d.selectionStart, end: d.selectionEnd } : (d = (d.ownerDocument && d.ownerDocument.defaultView || window).getSelection(), d = { anchorNode: d.anchorNode, anchorOffset: d.anchorOffset, focusNode: d.focusNode, focusOffset: d.focusOffset }), Se && Ie(Se, d) || (Se = d, d = oe(Re, "onSelect"), 0 < d.length && (b = new td("onSelect", "select", null, b, c2), a2.push({ event: b, listeners: d }), b.target = Qe)));
}
function Ve(a2, b) {
  var c2 = {};
  c2[a2.toLowerCase()] = b.toLowerCase();
  c2["Webkit" + a2] = "webkit" + b;
  c2["Moz" + a2] = "moz" + b;
  return c2;
}
var We = { animationend: Ve("Animation", "AnimationEnd"), animationiteration: Ve("Animation", "AnimationIteration"), animationstart: Ve("Animation", "AnimationStart"), transitionend: Ve("Transition", "TransitionEnd") }, Xe = {}, Ye = {};
ia && (Ye = document.createElement("div").style, "AnimationEvent" in window || (delete We.animationend.animation, delete We.animationiteration.animation, delete We.animationstart.animation), "TransitionEvent" in window || delete We.transitionend.transition);
function Ze(a2) {
  if (Xe[a2]) return Xe[a2];
  if (!We[a2]) return a2;
  var b = We[a2], c2;
  for (c2 in b) if (b.hasOwnProperty(c2) && c2 in Ye) return Xe[a2] = b[c2];
  return a2;
}
var $e = Ze("animationend"), af = Ze("animationiteration"), bf = Ze("animationstart"), cf = Ze("transitionend"), df = /* @__PURE__ */ new Map(), ef = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
function ff(a2, b) {
  df.set(a2, b);
  fa(b, [a2]);
}
for (var gf = 0; gf < ef.length; gf++) {
  var hf = ef[gf], jf = hf.toLowerCase(), kf = hf[0].toUpperCase() + hf.slice(1);
  ff(jf, "on" + kf);
}
ff($e, "onAnimationEnd");
ff(af, "onAnimationIteration");
ff(bf, "onAnimationStart");
ff("dblclick", "onDoubleClick");
ff("focusin", "onFocus");
ff("focusout", "onBlur");
ff(cf, "onTransitionEnd");
ha("onMouseEnter", ["mouseout", "mouseover"]);
ha("onMouseLeave", ["mouseout", "mouseover"]);
ha("onPointerEnter", ["pointerout", "pointerover"]);
ha("onPointerLeave", ["pointerout", "pointerover"]);
fa("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
fa("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
fa("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
fa("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
fa("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
fa("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
var lf = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), mf = new Set("cancel close invalid load scroll toggle".split(" ").concat(lf));
function nf(a2, b, c2) {
  var d = a2.type || "unknown-event";
  a2.currentTarget = c2;
  Ub(d, b, void 0, a2);
  a2.currentTarget = null;
}
function se(a2, b) {
  b = 0 !== (b & 4);
  for (var c2 = 0; c2 < a2.length; c2++) {
    var d = a2[c2], e2 = d.event;
    d = d.listeners;
    a: {
      var f2 = void 0;
      if (b) for (var g = d.length - 1; 0 <= g; g--) {
        var h = d[g], k2 = h.instance, l2 = h.currentTarget;
        h = h.listener;
        if (k2 !== f2 && e2.isPropagationStopped()) break a;
        nf(e2, h, l2);
        f2 = k2;
      }
      else for (g = 0; g < d.length; g++) {
        h = d[g];
        k2 = h.instance;
        l2 = h.currentTarget;
        h = h.listener;
        if (k2 !== f2 && e2.isPropagationStopped()) break a;
        nf(e2, h, l2);
        f2 = k2;
      }
    }
  }
  if (Qb) throw a2 = Rb, Qb = false, Rb = null, a2;
}
function D(a2, b) {
  var c2 = b[of];
  void 0 === c2 && (c2 = b[of] = /* @__PURE__ */ new Set());
  var d = a2 + "__bubble";
  c2.has(d) || (pf(b, a2, 2, false), c2.add(d));
}
function qf(a2, b, c2) {
  var d = 0;
  b && (d |= 4);
  pf(c2, a2, d, b);
}
var rf = "_reactListening" + Math.random().toString(36).slice(2);
function sf(a2) {
  if (!a2[rf]) {
    a2[rf] = true;
    da.forEach(function(b2) {
      "selectionchange" !== b2 && (mf.has(b2) || qf(b2, false, a2), qf(b2, true, a2));
    });
    var b = 9 === a2.nodeType ? a2 : a2.ownerDocument;
    null === b || b[rf] || (b[rf] = true, qf("selectionchange", false, b));
  }
}
function pf(a2, b, c2, d) {
  switch (jd(b)) {
    case 1:
      var e2 = ed;
      break;
    case 4:
      e2 = gd;
      break;
    default:
      e2 = fd;
  }
  c2 = e2.bind(null, b, c2, a2);
  e2 = void 0;
  !Lb || "touchstart" !== b && "touchmove" !== b && "wheel" !== b || (e2 = true);
  d ? void 0 !== e2 ? a2.addEventListener(b, c2, { capture: true, passive: e2 }) : a2.addEventListener(b, c2, true) : void 0 !== e2 ? a2.addEventListener(b, c2, { passive: e2 }) : a2.addEventListener(b, c2, false);
}
function hd(a2, b, c2, d, e2) {
  var f2 = d;
  if (0 === (b & 1) && 0 === (b & 2) && null !== d) a: for (; ; ) {
    if (null === d) return;
    var g = d.tag;
    if (3 === g || 4 === g) {
      var h = d.stateNode.containerInfo;
      if (h === e2 || 8 === h.nodeType && h.parentNode === e2) break;
      if (4 === g) for (g = d.return; null !== g; ) {
        var k2 = g.tag;
        if (3 === k2 || 4 === k2) {
          if (k2 = g.stateNode.containerInfo, k2 === e2 || 8 === k2.nodeType && k2.parentNode === e2) return;
        }
        g = g.return;
      }
      for (; null !== h; ) {
        g = Wc(h);
        if (null === g) return;
        k2 = g.tag;
        if (5 === k2 || 6 === k2) {
          d = f2 = g;
          continue a;
        }
        h = h.parentNode;
      }
    }
    d = d.return;
  }
  Jb(function() {
    var d2 = f2, e3 = xb(c2), g2 = [];
    a: {
      var h2 = df.get(a2);
      if (void 0 !== h2) {
        var k3 = td, n2 = a2;
        switch (a2) {
          case "keypress":
            if (0 === od(c2)) break a;
          case "keydown":
          case "keyup":
            k3 = Rd;
            break;
          case "focusin":
            n2 = "focus";
            k3 = Fd;
            break;
          case "focusout":
            n2 = "blur";
            k3 = Fd;
            break;
          case "beforeblur":
          case "afterblur":
            k3 = Fd;
            break;
          case "click":
            if (2 === c2.button) break a;
          case "auxclick":
          case "dblclick":
          case "mousedown":
          case "mousemove":
          case "mouseup":
          case "mouseout":
          case "mouseover":
          case "contextmenu":
            k3 = Bd;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            k3 = Dd;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            k3 = Vd;
            break;
          case $e:
          case af:
          case bf:
            k3 = Hd;
            break;
          case cf:
            k3 = Xd;
            break;
          case "scroll":
            k3 = vd;
            break;
          case "wheel":
            k3 = Zd;
            break;
          case "copy":
          case "cut":
          case "paste":
            k3 = Jd;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            k3 = Td;
        }
        var t2 = 0 !== (b & 4), J2 = !t2 && "scroll" === a2, x2 = t2 ? null !== h2 ? h2 + "Capture" : null : h2;
        t2 = [];
        for (var w2 = d2, u2; null !== w2; ) {
          u2 = w2;
          var F2 = u2.stateNode;
          5 === u2.tag && null !== F2 && (u2 = F2, null !== x2 && (F2 = Kb(w2, x2), null != F2 && t2.push(tf(w2, F2, u2))));
          if (J2) break;
          w2 = w2.return;
        }
        0 < t2.length && (h2 = new k3(h2, n2, null, c2, e3), g2.push({ event: h2, listeners: t2 }));
      }
    }
    if (0 === (b & 7)) {
      a: {
        h2 = "mouseover" === a2 || "pointerover" === a2;
        k3 = "mouseout" === a2 || "pointerout" === a2;
        if (h2 && c2 !== wb && (n2 = c2.relatedTarget || c2.fromElement) && (Wc(n2) || n2[uf])) break a;
        if (k3 || h2) {
          h2 = e3.window === e3 ? e3 : (h2 = e3.ownerDocument) ? h2.defaultView || h2.parentWindow : window;
          if (k3) {
            if (n2 = c2.relatedTarget || c2.toElement, k3 = d2, n2 = n2 ? Wc(n2) : null, null !== n2 && (J2 = Vb(n2), n2 !== J2 || 5 !== n2.tag && 6 !== n2.tag)) n2 = null;
          } else k3 = null, n2 = d2;
          if (k3 !== n2) {
            t2 = Bd;
            F2 = "onMouseLeave";
            x2 = "onMouseEnter";
            w2 = "mouse";
            if ("pointerout" === a2 || "pointerover" === a2) t2 = Td, F2 = "onPointerLeave", x2 = "onPointerEnter", w2 = "pointer";
            J2 = null == k3 ? h2 : ue(k3);
            u2 = null == n2 ? h2 : ue(n2);
            h2 = new t2(F2, w2 + "leave", k3, c2, e3);
            h2.target = J2;
            h2.relatedTarget = u2;
            F2 = null;
            Wc(e3) === d2 && (t2 = new t2(x2, w2 + "enter", n2, c2, e3), t2.target = u2, t2.relatedTarget = J2, F2 = t2);
            J2 = F2;
            if (k3 && n2) b: {
              t2 = k3;
              x2 = n2;
              w2 = 0;
              for (u2 = t2; u2; u2 = vf(u2)) w2++;
              u2 = 0;
              for (F2 = x2; F2; F2 = vf(F2)) u2++;
              for (; 0 < w2 - u2; ) t2 = vf(t2), w2--;
              for (; 0 < u2 - w2; ) x2 = vf(x2), u2--;
              for (; w2--; ) {
                if (t2 === x2 || null !== x2 && t2 === x2.alternate) break b;
                t2 = vf(t2);
                x2 = vf(x2);
              }
              t2 = null;
            }
            else t2 = null;
            null !== k3 && wf(g2, h2, k3, t2, false);
            null !== n2 && null !== J2 && wf(g2, J2, n2, t2, true);
          }
        }
      }
      a: {
        h2 = d2 ? ue(d2) : window;
        k3 = h2.nodeName && h2.nodeName.toLowerCase();
        if ("select" === k3 || "input" === k3 && "file" === h2.type) var na = ve;
        else if (me(h2)) if (we) na = Fe;
        else {
          na = De;
          var xa = Ce;
        }
        else (k3 = h2.nodeName) && "input" === k3.toLowerCase() && ("checkbox" === h2.type || "radio" === h2.type) && (na = Ee);
        if (na && (na = na(a2, d2))) {
          ne(g2, na, c2, e3);
          break a;
        }
        xa && xa(a2, h2, d2);
        "focusout" === a2 && (xa = h2._wrapperState) && xa.controlled && "number" === h2.type && cb(h2, "number", h2.value);
      }
      xa = d2 ? ue(d2) : window;
      switch (a2) {
        case "focusin":
          if (me(xa) || "true" === xa.contentEditable) Qe = xa, Re = d2, Se = null;
          break;
        case "focusout":
          Se = Re = Qe = null;
          break;
        case "mousedown":
          Te = true;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          Te = false;
          Ue(g2, c2, e3);
          break;
        case "selectionchange":
          if (Pe) break;
        case "keydown":
        case "keyup":
          Ue(g2, c2, e3);
      }
      var $a;
      if (ae) b: {
        switch (a2) {
          case "compositionstart":
            var ba = "onCompositionStart";
            break b;
          case "compositionend":
            ba = "onCompositionEnd";
            break b;
          case "compositionupdate":
            ba = "onCompositionUpdate";
            break b;
        }
        ba = void 0;
      }
      else ie ? ge(a2, c2) && (ba = "onCompositionEnd") : "keydown" === a2 && 229 === c2.keyCode && (ba = "onCompositionStart");
      ba && (de && "ko" !== c2.locale && (ie || "onCompositionStart" !== ba ? "onCompositionEnd" === ba && ie && ($a = nd()) : (kd = e3, ld = "value" in kd ? kd.value : kd.textContent, ie = true)), xa = oe(d2, ba), 0 < xa.length && (ba = new Ld(ba, a2, null, c2, e3), g2.push({ event: ba, listeners: xa }), $a ? ba.data = $a : ($a = he(c2), null !== $a && (ba.data = $a))));
      if ($a = ce ? je(a2, c2) : ke(a2, c2)) d2 = oe(d2, "onBeforeInput"), 0 < d2.length && (e3 = new Ld("onBeforeInput", "beforeinput", null, c2, e3), g2.push({ event: e3, listeners: d2 }), e3.data = $a);
    }
    se(g2, b);
  });
}
function tf(a2, b, c2) {
  return { instance: a2, listener: b, currentTarget: c2 };
}
function oe(a2, b) {
  for (var c2 = b + "Capture", d = []; null !== a2; ) {
    var e2 = a2, f2 = e2.stateNode;
    5 === e2.tag && null !== f2 && (e2 = f2, f2 = Kb(a2, c2), null != f2 && d.unshift(tf(a2, f2, e2)), f2 = Kb(a2, b), null != f2 && d.push(tf(a2, f2, e2)));
    a2 = a2.return;
  }
  return d;
}
function vf(a2) {
  if (null === a2) return null;
  do
    a2 = a2.return;
  while (a2 && 5 !== a2.tag);
  return a2 ? a2 : null;
}
function wf(a2, b, c2, d, e2) {
  for (var f2 = b._reactName, g = []; null !== c2 && c2 !== d; ) {
    var h = c2, k2 = h.alternate, l2 = h.stateNode;
    if (null !== k2 && k2 === d) break;
    5 === h.tag && null !== l2 && (h = l2, e2 ? (k2 = Kb(c2, f2), null != k2 && g.unshift(tf(c2, k2, h))) : e2 || (k2 = Kb(c2, f2), null != k2 && g.push(tf(c2, k2, h))));
    c2 = c2.return;
  }
  0 !== g.length && a2.push({ event: b, listeners: g });
}
var xf = /\r\n?/g, yf = /\u0000|\uFFFD/g;
function zf(a2) {
  return ("string" === typeof a2 ? a2 : "" + a2).replace(xf, "\n").replace(yf, "");
}
function Af(a2, b, c2) {
  b = zf(b);
  if (zf(a2) !== b && c2) throw Error(p$2(425));
}
function Bf() {
}
var Cf = null, Df = null;
function Ef(a2, b) {
  return "textarea" === a2 || "noscript" === a2 || "string" === typeof b.children || "number" === typeof b.children || "object" === typeof b.dangerouslySetInnerHTML && null !== b.dangerouslySetInnerHTML && null != b.dangerouslySetInnerHTML.__html;
}
var Ff = "function" === typeof setTimeout ? setTimeout : void 0, Gf = "function" === typeof clearTimeout ? clearTimeout : void 0, Hf = "function" === typeof Promise ? Promise : void 0, Jf = "function" === typeof queueMicrotask ? queueMicrotask : "undefined" !== typeof Hf ? function(a2) {
  return Hf.resolve(null).then(a2).catch(If);
} : Ff;
function If(a2) {
  setTimeout(function() {
    throw a2;
  });
}
function Kf(a2, b) {
  var c2 = b, d = 0;
  do {
    var e2 = c2.nextSibling;
    a2.removeChild(c2);
    if (e2 && 8 === e2.nodeType) if (c2 = e2.data, "/$" === c2) {
      if (0 === d) {
        a2.removeChild(e2);
        bd(b);
        return;
      }
      d--;
    } else "$" !== c2 && "$?" !== c2 && "$!" !== c2 || d++;
    c2 = e2;
  } while (c2);
  bd(b);
}
function Lf(a2) {
  for (; null != a2; a2 = a2.nextSibling) {
    var b = a2.nodeType;
    if (1 === b || 3 === b) break;
    if (8 === b) {
      b = a2.data;
      if ("$" === b || "$!" === b || "$?" === b) break;
      if ("/$" === b) return null;
    }
  }
  return a2;
}
function Mf(a2) {
  a2 = a2.previousSibling;
  for (var b = 0; a2; ) {
    if (8 === a2.nodeType) {
      var c2 = a2.data;
      if ("$" === c2 || "$!" === c2 || "$?" === c2) {
        if (0 === b) return a2;
        b--;
      } else "/$" === c2 && b++;
    }
    a2 = a2.previousSibling;
  }
  return null;
}
var Nf = Math.random().toString(36).slice(2), Of = "__reactFiber$" + Nf, Pf = "__reactProps$" + Nf, uf = "__reactContainer$" + Nf, of = "__reactEvents$" + Nf, Qf = "__reactListeners$" + Nf, Rf = "__reactHandles$" + Nf;
function Wc(a2) {
  var b = a2[Of];
  if (b) return b;
  for (var c2 = a2.parentNode; c2; ) {
    if (b = c2[uf] || c2[Of]) {
      c2 = b.alternate;
      if (null !== b.child || null !== c2 && null !== c2.child) for (a2 = Mf(a2); null !== a2; ) {
        if (c2 = a2[Of]) return c2;
        a2 = Mf(a2);
      }
      return b;
    }
    a2 = c2;
    c2 = a2.parentNode;
  }
  return null;
}
function Cb(a2) {
  a2 = a2[Of] || a2[uf];
  return !a2 || 5 !== a2.tag && 6 !== a2.tag && 13 !== a2.tag && 3 !== a2.tag ? null : a2;
}
function ue(a2) {
  if (5 === a2.tag || 6 === a2.tag) return a2.stateNode;
  throw Error(p$2(33));
}
function Db(a2) {
  return a2[Pf] || null;
}
var Sf = [], Tf = -1;
function Uf(a2) {
  return { current: a2 };
}
function E(a2) {
  0 > Tf || (a2.current = Sf[Tf], Sf[Tf] = null, Tf--);
}
function G(a2, b) {
  Tf++;
  Sf[Tf] = a2.current;
  a2.current = b;
}
var Vf = {}, H = Uf(Vf), Wf = Uf(false), Xf = Vf;
function Yf(a2, b) {
  var c2 = a2.type.contextTypes;
  if (!c2) return Vf;
  var d = a2.stateNode;
  if (d && d.__reactInternalMemoizedUnmaskedChildContext === b) return d.__reactInternalMemoizedMaskedChildContext;
  var e2 = {}, f2;
  for (f2 in c2) e2[f2] = b[f2];
  d && (a2 = a2.stateNode, a2.__reactInternalMemoizedUnmaskedChildContext = b, a2.__reactInternalMemoizedMaskedChildContext = e2);
  return e2;
}
function Zf(a2) {
  a2 = a2.childContextTypes;
  return null !== a2 && void 0 !== a2;
}
function $f() {
  E(Wf);
  E(H);
}
function ag(a2, b, c2) {
  if (H.current !== Vf) throw Error(p$2(168));
  G(H, b);
  G(Wf, c2);
}
function bg(a2, b, c2) {
  var d = a2.stateNode;
  b = b.childContextTypes;
  if ("function" !== typeof d.getChildContext) return c2;
  d = d.getChildContext();
  for (var e2 in d) if (!(e2 in b)) throw Error(p$2(108, Ra(a2) || "Unknown", e2));
  return A({}, c2, d);
}
function cg(a2) {
  a2 = (a2 = a2.stateNode) && a2.__reactInternalMemoizedMergedChildContext || Vf;
  Xf = H.current;
  G(H, a2);
  G(Wf, Wf.current);
  return true;
}
function dg(a2, b, c2) {
  var d = a2.stateNode;
  if (!d) throw Error(p$2(169));
  c2 ? (a2 = bg(a2, b, Xf), d.__reactInternalMemoizedMergedChildContext = a2, E(Wf), E(H), G(H, a2)) : E(Wf);
  G(Wf, c2);
}
var eg = null, fg = false, gg = false;
function hg(a2) {
  null === eg ? eg = [a2] : eg.push(a2);
}
function ig(a2) {
  fg = true;
  hg(a2);
}
function jg() {
  if (!gg && null !== eg) {
    gg = true;
    var a2 = 0, b = C;
    try {
      var c2 = eg;
      for (C = 1; a2 < c2.length; a2++) {
        var d = c2[a2];
        do
          d = d(true);
        while (null !== d);
      }
      eg = null;
      fg = false;
    } catch (e2) {
      throw null !== eg && (eg = eg.slice(a2 + 1)), ac(fc, jg), e2;
    } finally {
      C = b, gg = false;
    }
  }
  return null;
}
var kg = [], lg = 0, mg = null, ng = 0, og = [], pg = 0, qg = null, rg = 1, sg = "";
function tg(a2, b) {
  kg[lg++] = ng;
  kg[lg++] = mg;
  mg = a2;
  ng = b;
}
function ug(a2, b, c2) {
  og[pg++] = rg;
  og[pg++] = sg;
  og[pg++] = qg;
  qg = a2;
  var d = rg;
  a2 = sg;
  var e2 = 32 - oc(d) - 1;
  d &= ~(1 << e2);
  c2 += 1;
  var f2 = 32 - oc(b) + e2;
  if (30 < f2) {
    var g = e2 - e2 % 5;
    f2 = (d & (1 << g) - 1).toString(32);
    d >>= g;
    e2 -= g;
    rg = 1 << 32 - oc(b) + e2 | c2 << e2 | d;
    sg = f2 + a2;
  } else rg = 1 << f2 | c2 << e2 | d, sg = a2;
}
function vg(a2) {
  null !== a2.return && (tg(a2, 1), ug(a2, 1, 0));
}
function wg(a2) {
  for (; a2 === mg; ) mg = kg[--lg], kg[lg] = null, ng = kg[--lg], kg[lg] = null;
  for (; a2 === qg; ) qg = og[--pg], og[pg] = null, sg = og[--pg], og[pg] = null, rg = og[--pg], og[pg] = null;
}
var xg = null, yg = null, I$1 = false, zg = null;
function Ag(a2, b) {
  var c2 = Bg(5, null, null, 0);
  c2.elementType = "DELETED";
  c2.stateNode = b;
  c2.return = a2;
  b = a2.deletions;
  null === b ? (a2.deletions = [c2], a2.flags |= 16) : b.push(c2);
}
function Cg(a2, b) {
  switch (a2.tag) {
    case 5:
      var c2 = a2.type;
      b = 1 !== b.nodeType || c2.toLowerCase() !== b.nodeName.toLowerCase() ? null : b;
      return null !== b ? (a2.stateNode = b, xg = a2, yg = Lf(b.firstChild), true) : false;
    case 6:
      return b = "" === a2.pendingProps || 3 !== b.nodeType ? null : b, null !== b ? (a2.stateNode = b, xg = a2, yg = null, true) : false;
    case 13:
      return b = 8 !== b.nodeType ? null : b, null !== b ? (c2 = null !== qg ? { id: rg, overflow: sg } : null, a2.memoizedState = { dehydrated: b, treeContext: c2, retryLane: 1073741824 }, c2 = Bg(18, null, null, 0), c2.stateNode = b, c2.return = a2, a2.child = c2, xg = a2, yg = null, true) : false;
    default:
      return false;
  }
}
function Dg(a2) {
  return 0 !== (a2.mode & 1) && 0 === (a2.flags & 128);
}
function Eg(a2) {
  if (I$1) {
    var b = yg;
    if (b) {
      var c2 = b;
      if (!Cg(a2, b)) {
        if (Dg(a2)) throw Error(p$2(418));
        b = Lf(c2.nextSibling);
        var d = xg;
        b && Cg(a2, b) ? Ag(d, c2) : (a2.flags = a2.flags & -4097 | 2, I$1 = false, xg = a2);
      }
    } else {
      if (Dg(a2)) throw Error(p$2(418));
      a2.flags = a2.flags & -4097 | 2;
      I$1 = false;
      xg = a2;
    }
  }
}
function Fg(a2) {
  for (a2 = a2.return; null !== a2 && 5 !== a2.tag && 3 !== a2.tag && 13 !== a2.tag; ) a2 = a2.return;
  xg = a2;
}
function Gg(a2) {
  if (a2 !== xg) return false;
  if (!I$1) return Fg(a2), I$1 = true, false;
  var b;
  (b = 3 !== a2.tag) && !(b = 5 !== a2.tag) && (b = a2.type, b = "head" !== b && "body" !== b && !Ef(a2.type, a2.memoizedProps));
  if (b && (b = yg)) {
    if (Dg(a2)) throw Hg(), Error(p$2(418));
    for (; b; ) Ag(a2, b), b = Lf(b.nextSibling);
  }
  Fg(a2);
  if (13 === a2.tag) {
    a2 = a2.memoizedState;
    a2 = null !== a2 ? a2.dehydrated : null;
    if (!a2) throw Error(p$2(317));
    a: {
      a2 = a2.nextSibling;
      for (b = 0; a2; ) {
        if (8 === a2.nodeType) {
          var c2 = a2.data;
          if ("/$" === c2) {
            if (0 === b) {
              yg = Lf(a2.nextSibling);
              break a;
            }
            b--;
          } else "$" !== c2 && "$!" !== c2 && "$?" !== c2 || b++;
        }
        a2 = a2.nextSibling;
      }
      yg = null;
    }
  } else yg = xg ? Lf(a2.stateNode.nextSibling) : null;
  return true;
}
function Hg() {
  for (var a2 = yg; a2; ) a2 = Lf(a2.nextSibling);
}
function Ig() {
  yg = xg = null;
  I$1 = false;
}
function Jg(a2) {
  null === zg ? zg = [a2] : zg.push(a2);
}
var Kg = ua.ReactCurrentBatchConfig;
function Lg(a2, b, c2) {
  a2 = c2.ref;
  if (null !== a2 && "function" !== typeof a2 && "object" !== typeof a2) {
    if (c2._owner) {
      c2 = c2._owner;
      if (c2) {
        if (1 !== c2.tag) throw Error(p$2(309));
        var d = c2.stateNode;
      }
      if (!d) throw Error(p$2(147, a2));
      var e2 = d, f2 = "" + a2;
      if (null !== b && null !== b.ref && "function" === typeof b.ref && b.ref._stringRef === f2) return b.ref;
      b = function(a3) {
        var b2 = e2.refs;
        null === a3 ? delete b2[f2] : b2[f2] = a3;
      };
      b._stringRef = f2;
      return b;
    }
    if ("string" !== typeof a2) throw Error(p$2(284));
    if (!c2._owner) throw Error(p$2(290, a2));
  }
  return a2;
}
function Mg(a2, b) {
  a2 = Object.prototype.toString.call(b);
  throw Error(p$2(31, "[object Object]" === a2 ? "object with keys {" + Object.keys(b).join(", ") + "}" : a2));
}
function Ng(a2) {
  var b = a2._init;
  return b(a2._payload);
}
function Og(a2) {
  function b(b2, c3) {
    if (a2) {
      var d2 = b2.deletions;
      null === d2 ? (b2.deletions = [c3], b2.flags |= 16) : d2.push(c3);
    }
  }
  function c2(c3, d2) {
    if (!a2) return null;
    for (; null !== d2; ) b(c3, d2), d2 = d2.sibling;
    return null;
  }
  function d(a3, b2) {
    for (a3 = /* @__PURE__ */ new Map(); null !== b2; ) null !== b2.key ? a3.set(b2.key, b2) : a3.set(b2.index, b2), b2 = b2.sibling;
    return a3;
  }
  function e2(a3, b2) {
    a3 = Pg(a3, b2);
    a3.index = 0;
    a3.sibling = null;
    return a3;
  }
  function f2(b2, c3, d2) {
    b2.index = d2;
    if (!a2) return b2.flags |= 1048576, c3;
    d2 = b2.alternate;
    if (null !== d2) return d2 = d2.index, d2 < c3 ? (b2.flags |= 2, c3) : d2;
    b2.flags |= 2;
    return c3;
  }
  function g(b2) {
    a2 && null === b2.alternate && (b2.flags |= 2);
    return b2;
  }
  function h(a3, b2, c3, d2) {
    if (null === b2 || 6 !== b2.tag) return b2 = Qg(c3, a3.mode, d2), b2.return = a3, b2;
    b2 = e2(b2, c3);
    b2.return = a3;
    return b2;
  }
  function k2(a3, b2, c3, d2) {
    var f3 = c3.type;
    if (f3 === ya) return m2(a3, b2, c3.props.children, d2, c3.key);
    if (null !== b2 && (b2.elementType === f3 || "object" === typeof f3 && null !== f3 && f3.$$typeof === Ha && Ng(f3) === b2.type)) return d2 = e2(b2, c3.props), d2.ref = Lg(a3, b2, c3), d2.return = a3, d2;
    d2 = Rg(c3.type, c3.key, c3.props, null, a3.mode, d2);
    d2.ref = Lg(a3, b2, c3);
    d2.return = a3;
    return d2;
  }
  function l2(a3, b2, c3, d2) {
    if (null === b2 || 4 !== b2.tag || b2.stateNode.containerInfo !== c3.containerInfo || b2.stateNode.implementation !== c3.implementation) return b2 = Sg(c3, a3.mode, d2), b2.return = a3, b2;
    b2 = e2(b2, c3.children || []);
    b2.return = a3;
    return b2;
  }
  function m2(a3, b2, c3, d2, f3) {
    if (null === b2 || 7 !== b2.tag) return b2 = Tg(c3, a3.mode, d2, f3), b2.return = a3, b2;
    b2 = e2(b2, c3);
    b2.return = a3;
    return b2;
  }
  function q2(a3, b2, c3) {
    if ("string" === typeof b2 && "" !== b2 || "number" === typeof b2) return b2 = Qg("" + b2, a3.mode, c3), b2.return = a3, b2;
    if ("object" === typeof b2 && null !== b2) {
      switch (b2.$$typeof) {
        case va:
          return c3 = Rg(b2.type, b2.key, b2.props, null, a3.mode, c3), c3.ref = Lg(a3, null, b2), c3.return = a3, c3;
        case wa:
          return b2 = Sg(b2, a3.mode, c3), b2.return = a3, b2;
        case Ha:
          var d2 = b2._init;
          return q2(a3, d2(b2._payload), c3);
      }
      if (eb(b2) || Ka(b2)) return b2 = Tg(b2, a3.mode, c3, null), b2.return = a3, b2;
      Mg(a3, b2);
    }
    return null;
  }
  function r2(a3, b2, c3, d2) {
    var e3 = null !== b2 ? b2.key : null;
    if ("string" === typeof c3 && "" !== c3 || "number" === typeof c3) return null !== e3 ? null : h(a3, b2, "" + c3, d2);
    if ("object" === typeof c3 && null !== c3) {
      switch (c3.$$typeof) {
        case va:
          return c3.key === e3 ? k2(a3, b2, c3, d2) : null;
        case wa:
          return c3.key === e3 ? l2(a3, b2, c3, d2) : null;
        case Ha:
          return e3 = c3._init, r2(
            a3,
            b2,
            e3(c3._payload),
            d2
          );
      }
      if (eb(c3) || Ka(c3)) return null !== e3 ? null : m2(a3, b2, c3, d2, null);
      Mg(a3, c3);
    }
    return null;
  }
  function y2(a3, b2, c3, d2, e3) {
    if ("string" === typeof d2 && "" !== d2 || "number" === typeof d2) return a3 = a3.get(c3) || null, h(b2, a3, "" + d2, e3);
    if ("object" === typeof d2 && null !== d2) {
      switch (d2.$$typeof) {
        case va:
          return a3 = a3.get(null === d2.key ? c3 : d2.key) || null, k2(b2, a3, d2, e3);
        case wa:
          return a3 = a3.get(null === d2.key ? c3 : d2.key) || null, l2(b2, a3, d2, e3);
        case Ha:
          var f3 = d2._init;
          return y2(a3, b2, c3, f3(d2._payload), e3);
      }
      if (eb(d2) || Ka(d2)) return a3 = a3.get(c3) || null, m2(b2, a3, d2, e3, null);
      Mg(b2, d2);
    }
    return null;
  }
  function n2(e3, g2, h2, k3) {
    for (var l3 = null, m3 = null, u2 = g2, w2 = g2 = 0, x2 = null; null !== u2 && w2 < h2.length; w2++) {
      u2.index > w2 ? (x2 = u2, u2 = null) : x2 = u2.sibling;
      var n3 = r2(e3, u2, h2[w2], k3);
      if (null === n3) {
        null === u2 && (u2 = x2);
        break;
      }
      a2 && u2 && null === n3.alternate && b(e3, u2);
      g2 = f2(n3, g2, w2);
      null === m3 ? l3 = n3 : m3.sibling = n3;
      m3 = n3;
      u2 = x2;
    }
    if (w2 === h2.length) return c2(e3, u2), I$1 && tg(e3, w2), l3;
    if (null === u2) {
      for (; w2 < h2.length; w2++) u2 = q2(e3, h2[w2], k3), null !== u2 && (g2 = f2(u2, g2, w2), null === m3 ? l3 = u2 : m3.sibling = u2, m3 = u2);
      I$1 && tg(e3, w2);
      return l3;
    }
    for (u2 = d(e3, u2); w2 < h2.length; w2++) x2 = y2(u2, e3, w2, h2[w2], k3), null !== x2 && (a2 && null !== x2.alternate && u2.delete(null === x2.key ? w2 : x2.key), g2 = f2(x2, g2, w2), null === m3 ? l3 = x2 : m3.sibling = x2, m3 = x2);
    a2 && u2.forEach(function(a3) {
      return b(e3, a3);
    });
    I$1 && tg(e3, w2);
    return l3;
  }
  function t2(e3, g2, h2, k3) {
    var l3 = Ka(h2);
    if ("function" !== typeof l3) throw Error(p$2(150));
    h2 = l3.call(h2);
    if (null == h2) throw Error(p$2(151));
    for (var u2 = l3 = null, m3 = g2, w2 = g2 = 0, x2 = null, n3 = h2.next(); null !== m3 && !n3.done; w2++, n3 = h2.next()) {
      m3.index > w2 ? (x2 = m3, m3 = null) : x2 = m3.sibling;
      var t3 = r2(e3, m3, n3.value, k3);
      if (null === t3) {
        null === m3 && (m3 = x2);
        break;
      }
      a2 && m3 && null === t3.alternate && b(e3, m3);
      g2 = f2(t3, g2, w2);
      null === u2 ? l3 = t3 : u2.sibling = t3;
      u2 = t3;
      m3 = x2;
    }
    if (n3.done) return c2(
      e3,
      m3
    ), I$1 && tg(e3, w2), l3;
    if (null === m3) {
      for (; !n3.done; w2++, n3 = h2.next()) n3 = q2(e3, n3.value, k3), null !== n3 && (g2 = f2(n3, g2, w2), null === u2 ? l3 = n3 : u2.sibling = n3, u2 = n3);
      I$1 && tg(e3, w2);
      return l3;
    }
    for (m3 = d(e3, m3); !n3.done; w2++, n3 = h2.next()) n3 = y2(m3, e3, w2, n3.value, k3), null !== n3 && (a2 && null !== n3.alternate && m3.delete(null === n3.key ? w2 : n3.key), g2 = f2(n3, g2, w2), null === u2 ? l3 = n3 : u2.sibling = n3, u2 = n3);
    a2 && m3.forEach(function(a3) {
      return b(e3, a3);
    });
    I$1 && tg(e3, w2);
    return l3;
  }
  function J2(a3, d2, f3, h2) {
    "object" === typeof f3 && null !== f3 && f3.type === ya && null === f3.key && (f3 = f3.props.children);
    if ("object" === typeof f3 && null !== f3) {
      switch (f3.$$typeof) {
        case va:
          a: {
            for (var k3 = f3.key, l3 = d2; null !== l3; ) {
              if (l3.key === k3) {
                k3 = f3.type;
                if (k3 === ya) {
                  if (7 === l3.tag) {
                    c2(a3, l3.sibling);
                    d2 = e2(l3, f3.props.children);
                    d2.return = a3;
                    a3 = d2;
                    break a;
                  }
                } else if (l3.elementType === k3 || "object" === typeof k3 && null !== k3 && k3.$$typeof === Ha && Ng(k3) === l3.type) {
                  c2(a3, l3.sibling);
                  d2 = e2(l3, f3.props);
                  d2.ref = Lg(a3, l3, f3);
                  d2.return = a3;
                  a3 = d2;
                  break a;
                }
                c2(a3, l3);
                break;
              } else b(a3, l3);
              l3 = l3.sibling;
            }
            f3.type === ya ? (d2 = Tg(f3.props.children, a3.mode, h2, f3.key), d2.return = a3, a3 = d2) : (h2 = Rg(f3.type, f3.key, f3.props, null, a3.mode, h2), h2.ref = Lg(a3, d2, f3), h2.return = a3, a3 = h2);
          }
          return g(a3);
        case wa:
          a: {
            for (l3 = f3.key; null !== d2; ) {
              if (d2.key === l3) if (4 === d2.tag && d2.stateNode.containerInfo === f3.containerInfo && d2.stateNode.implementation === f3.implementation) {
                c2(a3, d2.sibling);
                d2 = e2(d2, f3.children || []);
                d2.return = a3;
                a3 = d2;
                break a;
              } else {
                c2(a3, d2);
                break;
              }
              else b(a3, d2);
              d2 = d2.sibling;
            }
            d2 = Sg(f3, a3.mode, h2);
            d2.return = a3;
            a3 = d2;
          }
          return g(a3);
        case Ha:
          return l3 = f3._init, J2(a3, d2, l3(f3._payload), h2);
      }
      if (eb(f3)) return n2(a3, d2, f3, h2);
      if (Ka(f3)) return t2(a3, d2, f3, h2);
      Mg(a3, f3);
    }
    return "string" === typeof f3 && "" !== f3 || "number" === typeof f3 ? (f3 = "" + f3, null !== d2 && 6 === d2.tag ? (c2(a3, d2.sibling), d2 = e2(d2, f3), d2.return = a3, a3 = d2) : (c2(a3, d2), d2 = Qg(f3, a3.mode, h2), d2.return = a3, a3 = d2), g(a3)) : c2(a3, d2);
  }
  return J2;
}
var Ug = Og(true), Vg = Og(false), Wg = Uf(null), Xg = null, Yg = null, Zg = null;
function $g() {
  Zg = Yg = Xg = null;
}
function ah(a2) {
  var b = Wg.current;
  E(Wg);
  a2._currentValue = b;
}
function bh(a2, b, c2) {
  for (; null !== a2; ) {
    var d = a2.alternate;
    (a2.childLanes & b) !== b ? (a2.childLanes |= b, null !== d && (d.childLanes |= b)) : null !== d && (d.childLanes & b) !== b && (d.childLanes |= b);
    if (a2 === c2) break;
    a2 = a2.return;
  }
}
function ch(a2, b) {
  Xg = a2;
  Zg = Yg = null;
  a2 = a2.dependencies;
  null !== a2 && null !== a2.firstContext && (0 !== (a2.lanes & b) && (dh = true), a2.firstContext = null);
}
function eh(a2) {
  var b = a2._currentValue;
  if (Zg !== a2) if (a2 = { context: a2, memoizedValue: b, next: null }, null === Yg) {
    if (null === Xg) throw Error(p$2(308));
    Yg = a2;
    Xg.dependencies = { lanes: 0, firstContext: a2 };
  } else Yg = Yg.next = a2;
  return b;
}
var fh = null;
function gh(a2) {
  null === fh ? fh = [a2] : fh.push(a2);
}
function hh(a2, b, c2, d) {
  var e2 = b.interleaved;
  null === e2 ? (c2.next = c2, gh(b)) : (c2.next = e2.next, e2.next = c2);
  b.interleaved = c2;
  return ih(a2, d);
}
function ih(a2, b) {
  a2.lanes |= b;
  var c2 = a2.alternate;
  null !== c2 && (c2.lanes |= b);
  c2 = a2;
  for (a2 = a2.return; null !== a2; ) a2.childLanes |= b, c2 = a2.alternate, null !== c2 && (c2.childLanes |= b), c2 = a2, a2 = a2.return;
  return 3 === c2.tag ? c2.stateNode : null;
}
var jh = false;
function kh(a2) {
  a2.updateQueue = { baseState: a2.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
}
function lh(a2, b) {
  a2 = a2.updateQueue;
  b.updateQueue === a2 && (b.updateQueue = { baseState: a2.baseState, firstBaseUpdate: a2.firstBaseUpdate, lastBaseUpdate: a2.lastBaseUpdate, shared: a2.shared, effects: a2.effects });
}
function mh(a2, b) {
  return { eventTime: a2, lane: b, tag: 0, payload: null, callback: null, next: null };
}
function nh(a2, b, c2) {
  var d = a2.updateQueue;
  if (null === d) return null;
  d = d.shared;
  if (0 !== (K & 2)) {
    var e2 = d.pending;
    null === e2 ? b.next = b : (b.next = e2.next, e2.next = b);
    d.pending = b;
    return ih(a2, c2);
  }
  e2 = d.interleaved;
  null === e2 ? (b.next = b, gh(d)) : (b.next = e2.next, e2.next = b);
  d.interleaved = b;
  return ih(a2, c2);
}
function oh(a2, b, c2) {
  b = b.updateQueue;
  if (null !== b && (b = b.shared, 0 !== (c2 & 4194240))) {
    var d = b.lanes;
    d &= a2.pendingLanes;
    c2 |= d;
    b.lanes = c2;
    Cc(a2, c2);
  }
}
function ph(a2, b) {
  var c2 = a2.updateQueue, d = a2.alternate;
  if (null !== d && (d = d.updateQueue, c2 === d)) {
    var e2 = null, f2 = null;
    c2 = c2.firstBaseUpdate;
    if (null !== c2) {
      do {
        var g = { eventTime: c2.eventTime, lane: c2.lane, tag: c2.tag, payload: c2.payload, callback: c2.callback, next: null };
        null === f2 ? e2 = f2 = g : f2 = f2.next = g;
        c2 = c2.next;
      } while (null !== c2);
      null === f2 ? e2 = f2 = b : f2 = f2.next = b;
    } else e2 = f2 = b;
    c2 = { baseState: d.baseState, firstBaseUpdate: e2, lastBaseUpdate: f2, shared: d.shared, effects: d.effects };
    a2.updateQueue = c2;
    return;
  }
  a2 = c2.lastBaseUpdate;
  null === a2 ? c2.firstBaseUpdate = b : a2.next = b;
  c2.lastBaseUpdate = b;
}
function qh(a2, b, c2, d) {
  var e2 = a2.updateQueue;
  jh = false;
  var f2 = e2.firstBaseUpdate, g = e2.lastBaseUpdate, h = e2.shared.pending;
  if (null !== h) {
    e2.shared.pending = null;
    var k2 = h, l2 = k2.next;
    k2.next = null;
    null === g ? f2 = l2 : g.next = l2;
    g = k2;
    var m2 = a2.alternate;
    null !== m2 && (m2 = m2.updateQueue, h = m2.lastBaseUpdate, h !== g && (null === h ? m2.firstBaseUpdate = l2 : h.next = l2, m2.lastBaseUpdate = k2));
  }
  if (null !== f2) {
    var q2 = e2.baseState;
    g = 0;
    m2 = l2 = k2 = null;
    h = f2;
    do {
      var r2 = h.lane, y2 = h.eventTime;
      if ((d & r2) === r2) {
        null !== m2 && (m2 = m2.next = {
          eventTime: y2,
          lane: 0,
          tag: h.tag,
          payload: h.payload,
          callback: h.callback,
          next: null
        });
        a: {
          var n2 = a2, t2 = h;
          r2 = b;
          y2 = c2;
          switch (t2.tag) {
            case 1:
              n2 = t2.payload;
              if ("function" === typeof n2) {
                q2 = n2.call(y2, q2, r2);
                break a;
              }
              q2 = n2;
              break a;
            case 3:
              n2.flags = n2.flags & -65537 | 128;
            case 0:
              n2 = t2.payload;
              r2 = "function" === typeof n2 ? n2.call(y2, q2, r2) : n2;
              if (null === r2 || void 0 === r2) break a;
              q2 = A({}, q2, r2);
              break a;
            case 2:
              jh = true;
          }
        }
        null !== h.callback && 0 !== h.lane && (a2.flags |= 64, r2 = e2.effects, null === r2 ? e2.effects = [h] : r2.push(h));
      } else y2 = { eventTime: y2, lane: r2, tag: h.tag, payload: h.payload, callback: h.callback, next: null }, null === m2 ? (l2 = m2 = y2, k2 = q2) : m2 = m2.next = y2, g |= r2;
      h = h.next;
      if (null === h) if (h = e2.shared.pending, null === h) break;
      else r2 = h, h = r2.next, r2.next = null, e2.lastBaseUpdate = r2, e2.shared.pending = null;
    } while (1);
    null === m2 && (k2 = q2);
    e2.baseState = k2;
    e2.firstBaseUpdate = l2;
    e2.lastBaseUpdate = m2;
    b = e2.shared.interleaved;
    if (null !== b) {
      e2 = b;
      do
        g |= e2.lane, e2 = e2.next;
      while (e2 !== b);
    } else null === f2 && (e2.shared.lanes = 0);
    rh |= g;
    a2.lanes = g;
    a2.memoizedState = q2;
  }
}
function sh(a2, b, c2) {
  a2 = b.effects;
  b.effects = null;
  if (null !== a2) for (b = 0; b < a2.length; b++) {
    var d = a2[b], e2 = d.callback;
    if (null !== e2) {
      d.callback = null;
      d = c2;
      if ("function" !== typeof e2) throw Error(p$2(191, e2));
      e2.call(d);
    }
  }
}
var th = {}, uh = Uf(th), vh = Uf(th), wh = Uf(th);
function xh(a2) {
  if (a2 === th) throw Error(p$2(174));
  return a2;
}
function yh(a2, b) {
  G(wh, b);
  G(vh, a2);
  G(uh, th);
  a2 = b.nodeType;
  switch (a2) {
    case 9:
    case 11:
      b = (b = b.documentElement) ? b.namespaceURI : lb(null, "");
      break;
    default:
      a2 = 8 === a2 ? b.parentNode : b, b = a2.namespaceURI || null, a2 = a2.tagName, b = lb(b, a2);
  }
  E(uh);
  G(uh, b);
}
function zh() {
  E(uh);
  E(vh);
  E(wh);
}
function Ah(a2) {
  xh(wh.current);
  var b = xh(uh.current);
  var c2 = lb(b, a2.type);
  b !== c2 && (G(vh, a2), G(uh, c2));
}
function Bh(a2) {
  vh.current === a2 && (E(uh), E(vh));
}
var L = Uf(0);
function Ch(a2) {
  for (var b = a2; null !== b; ) {
    if (13 === b.tag) {
      var c2 = b.memoizedState;
      if (null !== c2 && (c2 = c2.dehydrated, null === c2 || "$?" === c2.data || "$!" === c2.data)) return b;
    } else if (19 === b.tag && void 0 !== b.memoizedProps.revealOrder) {
      if (0 !== (b.flags & 128)) return b;
    } else if (null !== b.child) {
      b.child.return = b;
      b = b.child;
      continue;
    }
    if (b === a2) break;
    for (; null === b.sibling; ) {
      if (null === b.return || b.return === a2) return null;
      b = b.return;
    }
    b.sibling.return = b.return;
    b = b.sibling;
  }
  return null;
}
var Dh = [];
function Eh() {
  for (var a2 = 0; a2 < Dh.length; a2++) Dh[a2]._workInProgressVersionPrimary = null;
  Dh.length = 0;
}
var Fh = ua.ReactCurrentDispatcher, Gh = ua.ReactCurrentBatchConfig, Hh = 0, M = null, N = null, O = null, Ih = false, Jh = false, Kh = 0, Lh = 0;
function P() {
  throw Error(p$2(321));
}
function Mh(a2, b) {
  if (null === b) return false;
  for (var c2 = 0; c2 < b.length && c2 < a2.length; c2++) if (!He(a2[c2], b[c2])) return false;
  return true;
}
function Nh(a2, b, c2, d, e2, f2) {
  Hh = f2;
  M = b;
  b.memoizedState = null;
  b.updateQueue = null;
  b.lanes = 0;
  Fh.current = null === a2 || null === a2.memoizedState ? Oh : Ph;
  a2 = c2(d, e2);
  if (Jh) {
    f2 = 0;
    do {
      Jh = false;
      Kh = 0;
      if (25 <= f2) throw Error(p$2(301));
      f2 += 1;
      O = N = null;
      b.updateQueue = null;
      Fh.current = Qh;
      a2 = c2(d, e2);
    } while (Jh);
  }
  Fh.current = Rh;
  b = null !== N && null !== N.next;
  Hh = 0;
  O = N = M = null;
  Ih = false;
  if (b) throw Error(p$2(300));
  return a2;
}
function Sh() {
  var a2 = 0 !== Kh;
  Kh = 0;
  return a2;
}
function Th() {
  var a2 = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
  null === O ? M.memoizedState = O = a2 : O = O.next = a2;
  return O;
}
function Uh() {
  if (null === N) {
    var a2 = M.alternate;
    a2 = null !== a2 ? a2.memoizedState : null;
  } else a2 = N.next;
  var b = null === O ? M.memoizedState : O.next;
  if (null !== b) O = b, N = a2;
  else {
    if (null === a2) throw Error(p$2(310));
    N = a2;
    a2 = { memoizedState: N.memoizedState, baseState: N.baseState, baseQueue: N.baseQueue, queue: N.queue, next: null };
    null === O ? M.memoizedState = O = a2 : O = O.next = a2;
  }
  return O;
}
function Vh(a2, b) {
  return "function" === typeof b ? b(a2) : b;
}
function Wh(a2) {
  var b = Uh(), c2 = b.queue;
  if (null === c2) throw Error(p$2(311));
  c2.lastRenderedReducer = a2;
  var d = N, e2 = d.baseQueue, f2 = c2.pending;
  if (null !== f2) {
    if (null !== e2) {
      var g = e2.next;
      e2.next = f2.next;
      f2.next = g;
    }
    d.baseQueue = e2 = f2;
    c2.pending = null;
  }
  if (null !== e2) {
    f2 = e2.next;
    d = d.baseState;
    var h = g = null, k2 = null, l2 = f2;
    do {
      var m2 = l2.lane;
      if ((Hh & m2) === m2) null !== k2 && (k2 = k2.next = { lane: 0, action: l2.action, hasEagerState: l2.hasEagerState, eagerState: l2.eagerState, next: null }), d = l2.hasEagerState ? l2.eagerState : a2(d, l2.action);
      else {
        var q2 = {
          lane: m2,
          action: l2.action,
          hasEagerState: l2.hasEagerState,
          eagerState: l2.eagerState,
          next: null
        };
        null === k2 ? (h = k2 = q2, g = d) : k2 = k2.next = q2;
        M.lanes |= m2;
        rh |= m2;
      }
      l2 = l2.next;
    } while (null !== l2 && l2 !== f2);
    null === k2 ? g = d : k2.next = h;
    He(d, b.memoizedState) || (dh = true);
    b.memoizedState = d;
    b.baseState = g;
    b.baseQueue = k2;
    c2.lastRenderedState = d;
  }
  a2 = c2.interleaved;
  if (null !== a2) {
    e2 = a2;
    do
      f2 = e2.lane, M.lanes |= f2, rh |= f2, e2 = e2.next;
    while (e2 !== a2);
  } else null === e2 && (c2.lanes = 0);
  return [b.memoizedState, c2.dispatch];
}
function Xh(a2) {
  var b = Uh(), c2 = b.queue;
  if (null === c2) throw Error(p$2(311));
  c2.lastRenderedReducer = a2;
  var d = c2.dispatch, e2 = c2.pending, f2 = b.memoizedState;
  if (null !== e2) {
    c2.pending = null;
    var g = e2 = e2.next;
    do
      f2 = a2(f2, g.action), g = g.next;
    while (g !== e2);
    He(f2, b.memoizedState) || (dh = true);
    b.memoizedState = f2;
    null === b.baseQueue && (b.baseState = f2);
    c2.lastRenderedState = f2;
  }
  return [f2, d];
}
function Yh() {
}
function Zh(a2, b) {
  var c2 = M, d = Uh(), e2 = b(), f2 = !He(d.memoizedState, e2);
  f2 && (d.memoizedState = e2, dh = true);
  d = d.queue;
  $h(ai.bind(null, c2, d, a2), [a2]);
  if (d.getSnapshot !== b || f2 || null !== O && O.memoizedState.tag & 1) {
    c2.flags |= 2048;
    bi(9, ci.bind(null, c2, d, e2, b), void 0, null);
    if (null === Q) throw Error(p$2(349));
    0 !== (Hh & 30) || di(c2, b, e2);
  }
  return e2;
}
function di(a2, b, c2) {
  a2.flags |= 16384;
  a2 = { getSnapshot: b, value: c2 };
  b = M.updateQueue;
  null === b ? (b = { lastEffect: null, stores: null }, M.updateQueue = b, b.stores = [a2]) : (c2 = b.stores, null === c2 ? b.stores = [a2] : c2.push(a2));
}
function ci(a2, b, c2, d) {
  b.value = c2;
  b.getSnapshot = d;
  ei(b) && fi(a2);
}
function ai(a2, b, c2) {
  return c2(function() {
    ei(b) && fi(a2);
  });
}
function ei(a2) {
  var b = a2.getSnapshot;
  a2 = a2.value;
  try {
    var c2 = b();
    return !He(a2, c2);
  } catch (d) {
    return true;
  }
}
function fi(a2) {
  var b = ih(a2, 1);
  null !== b && gi(b, a2, 1, -1);
}
function hi(a2) {
  var b = Th();
  "function" === typeof a2 && (a2 = a2());
  b.memoizedState = b.baseState = a2;
  a2 = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Vh, lastRenderedState: a2 };
  b.queue = a2;
  a2 = a2.dispatch = ii.bind(null, M, a2);
  return [b.memoizedState, a2];
}
function bi(a2, b, c2, d) {
  a2 = { tag: a2, create: b, destroy: c2, deps: d, next: null };
  b = M.updateQueue;
  null === b ? (b = { lastEffect: null, stores: null }, M.updateQueue = b, b.lastEffect = a2.next = a2) : (c2 = b.lastEffect, null === c2 ? b.lastEffect = a2.next = a2 : (d = c2.next, c2.next = a2, a2.next = d, b.lastEffect = a2));
  return a2;
}
function ji() {
  return Uh().memoizedState;
}
function ki(a2, b, c2, d) {
  var e2 = Th();
  M.flags |= a2;
  e2.memoizedState = bi(1 | b, c2, void 0, void 0 === d ? null : d);
}
function li(a2, b, c2, d) {
  var e2 = Uh();
  d = void 0 === d ? null : d;
  var f2 = void 0;
  if (null !== N) {
    var g = N.memoizedState;
    f2 = g.destroy;
    if (null !== d && Mh(d, g.deps)) {
      e2.memoizedState = bi(b, c2, f2, d);
      return;
    }
  }
  M.flags |= a2;
  e2.memoizedState = bi(1 | b, c2, f2, d);
}
function mi(a2, b) {
  return ki(8390656, 8, a2, b);
}
function $h(a2, b) {
  return li(2048, 8, a2, b);
}
function ni(a2, b) {
  return li(4, 2, a2, b);
}
function oi(a2, b) {
  return li(4, 4, a2, b);
}
function pi(a2, b) {
  if ("function" === typeof b) return a2 = a2(), b(a2), function() {
    b(null);
  };
  if (null !== b && void 0 !== b) return a2 = a2(), b.current = a2, function() {
    b.current = null;
  };
}
function qi(a2, b, c2) {
  c2 = null !== c2 && void 0 !== c2 ? c2.concat([a2]) : null;
  return li(4, 4, pi.bind(null, b, a2), c2);
}
function ri() {
}
function si(a2, b) {
  var c2 = Uh();
  b = void 0 === b ? null : b;
  var d = c2.memoizedState;
  if (null !== d && null !== b && Mh(b, d[1])) return d[0];
  c2.memoizedState = [a2, b];
  return a2;
}
function ti(a2, b) {
  var c2 = Uh();
  b = void 0 === b ? null : b;
  var d = c2.memoizedState;
  if (null !== d && null !== b && Mh(b, d[1])) return d[0];
  a2 = a2();
  c2.memoizedState = [a2, b];
  return a2;
}
function ui(a2, b, c2) {
  if (0 === (Hh & 21)) return a2.baseState && (a2.baseState = false, dh = true), a2.memoizedState = c2;
  He(c2, b) || (c2 = yc(), M.lanes |= c2, rh |= c2, a2.baseState = true);
  return b;
}
function vi(a2, b) {
  var c2 = C;
  C = 0 !== c2 && 4 > c2 ? c2 : 4;
  a2(true);
  var d = Gh.transition;
  Gh.transition = {};
  try {
    a2(false), b();
  } finally {
    C = c2, Gh.transition = d;
  }
}
function wi() {
  return Uh().memoizedState;
}
function xi(a2, b, c2) {
  var d = yi(a2);
  c2 = { lane: d, action: c2, hasEagerState: false, eagerState: null, next: null };
  if (zi(a2)) Ai(b, c2);
  else if (c2 = hh(a2, b, c2, d), null !== c2) {
    var e2 = R();
    gi(c2, a2, d, e2);
    Bi(c2, b, d);
  }
}
function ii(a2, b, c2) {
  var d = yi(a2), e2 = { lane: d, action: c2, hasEagerState: false, eagerState: null, next: null };
  if (zi(a2)) Ai(b, e2);
  else {
    var f2 = a2.alternate;
    if (0 === a2.lanes && (null === f2 || 0 === f2.lanes) && (f2 = b.lastRenderedReducer, null !== f2)) try {
      var g = b.lastRenderedState, h = f2(g, c2);
      e2.hasEagerState = true;
      e2.eagerState = h;
      if (He(h, g)) {
        var k2 = b.interleaved;
        null === k2 ? (e2.next = e2, gh(b)) : (e2.next = k2.next, k2.next = e2);
        b.interleaved = e2;
        return;
      }
    } catch (l2) {
    } finally {
    }
    c2 = hh(a2, b, e2, d);
    null !== c2 && (e2 = R(), gi(c2, a2, d, e2), Bi(c2, b, d));
  }
}
function zi(a2) {
  var b = a2.alternate;
  return a2 === M || null !== b && b === M;
}
function Ai(a2, b) {
  Jh = Ih = true;
  var c2 = a2.pending;
  null === c2 ? b.next = b : (b.next = c2.next, c2.next = b);
  a2.pending = b;
}
function Bi(a2, b, c2) {
  if (0 !== (c2 & 4194240)) {
    var d = b.lanes;
    d &= a2.pendingLanes;
    c2 |= d;
    b.lanes = c2;
    Cc(a2, c2);
  }
}
var Rh = { readContext: eh, useCallback: P, useContext: P, useEffect: P, useImperativeHandle: P, useInsertionEffect: P, useLayoutEffect: P, useMemo: P, useReducer: P, useRef: P, useState: P, useDebugValue: P, useDeferredValue: P, useTransition: P, useMutableSource: P, useSyncExternalStore: P, useId: P, unstable_isNewReconciler: false }, Oh = { readContext: eh, useCallback: function(a2, b) {
  Th().memoizedState = [a2, void 0 === b ? null : b];
  return a2;
}, useContext: eh, useEffect: mi, useImperativeHandle: function(a2, b, c2) {
  c2 = null !== c2 && void 0 !== c2 ? c2.concat([a2]) : null;
  return ki(
    4194308,
    4,
    pi.bind(null, b, a2),
    c2
  );
}, useLayoutEffect: function(a2, b) {
  return ki(4194308, 4, a2, b);
}, useInsertionEffect: function(a2, b) {
  return ki(4, 2, a2, b);
}, useMemo: function(a2, b) {
  var c2 = Th();
  b = void 0 === b ? null : b;
  a2 = a2();
  c2.memoizedState = [a2, b];
  return a2;
}, useReducer: function(a2, b, c2) {
  var d = Th();
  b = void 0 !== c2 ? c2(b) : b;
  d.memoizedState = d.baseState = b;
  a2 = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: a2, lastRenderedState: b };
  d.queue = a2;
  a2 = a2.dispatch = xi.bind(null, M, a2);
  return [d.memoizedState, a2];
}, useRef: function(a2) {
  var b = Th();
  a2 = { current: a2 };
  return b.memoizedState = a2;
}, useState: hi, useDebugValue: ri, useDeferredValue: function(a2) {
  return Th().memoizedState = a2;
}, useTransition: function() {
  var a2 = hi(false), b = a2[0];
  a2 = vi.bind(null, a2[1]);
  Th().memoizedState = a2;
  return [b, a2];
}, useMutableSource: function() {
}, useSyncExternalStore: function(a2, b, c2) {
  var d = M, e2 = Th();
  if (I$1) {
    if (void 0 === c2) throw Error(p$2(407));
    c2 = c2();
  } else {
    c2 = b();
    if (null === Q) throw Error(p$2(349));
    0 !== (Hh & 30) || di(d, b, c2);
  }
  e2.memoizedState = c2;
  var f2 = { value: c2, getSnapshot: b };
  e2.queue = f2;
  mi(ai.bind(
    null,
    d,
    f2,
    a2
  ), [a2]);
  d.flags |= 2048;
  bi(9, ci.bind(null, d, f2, c2, b), void 0, null);
  return c2;
}, useId: function() {
  var a2 = Th(), b = Q.identifierPrefix;
  if (I$1) {
    var c2 = sg;
    var d = rg;
    c2 = (d & ~(1 << 32 - oc(d) - 1)).toString(32) + c2;
    b = ":" + b + "R" + c2;
    c2 = Kh++;
    0 < c2 && (b += "H" + c2.toString(32));
    b += ":";
  } else c2 = Lh++, b = ":" + b + "r" + c2.toString(32) + ":";
  return a2.memoizedState = b;
}, unstable_isNewReconciler: false }, Ph = {
  readContext: eh,
  useCallback: si,
  useContext: eh,
  useEffect: $h,
  useImperativeHandle: qi,
  useInsertionEffect: ni,
  useLayoutEffect: oi,
  useMemo: ti,
  useReducer: Wh,
  useRef: ji,
  useState: function() {
    return Wh(Vh);
  },
  useDebugValue: ri,
  useDeferredValue: function(a2) {
    var b = Uh();
    return ui(b, N.memoizedState, a2);
  },
  useTransition: function() {
    var a2 = Wh(Vh)[0], b = Uh().memoizedState;
    return [a2, b];
  },
  useMutableSource: Yh,
  useSyncExternalStore: Zh,
  useId: wi,
  unstable_isNewReconciler: false
}, Qh = { readContext: eh, useCallback: si, useContext: eh, useEffect: $h, useImperativeHandle: qi, useInsertionEffect: ni, useLayoutEffect: oi, useMemo: ti, useReducer: Xh, useRef: ji, useState: function() {
  return Xh(Vh);
}, useDebugValue: ri, useDeferredValue: function(a2) {
  var b = Uh();
  return null === N ? b.memoizedState = a2 : ui(b, N.memoizedState, a2);
}, useTransition: function() {
  var a2 = Xh(Vh)[0], b = Uh().memoizedState;
  return [a2, b];
}, useMutableSource: Yh, useSyncExternalStore: Zh, useId: wi, unstable_isNewReconciler: false };
function Ci(a2, b) {
  if (a2 && a2.defaultProps) {
    b = A({}, b);
    a2 = a2.defaultProps;
    for (var c2 in a2) void 0 === b[c2] && (b[c2] = a2[c2]);
    return b;
  }
  return b;
}
function Di(a2, b, c2, d) {
  b = a2.memoizedState;
  c2 = c2(d, b);
  c2 = null === c2 || void 0 === c2 ? b : A({}, b, c2);
  a2.memoizedState = c2;
  0 === a2.lanes && (a2.updateQueue.baseState = c2);
}
var Ei = { isMounted: function(a2) {
  return (a2 = a2._reactInternals) ? Vb(a2) === a2 : false;
}, enqueueSetState: function(a2, b, c2) {
  a2 = a2._reactInternals;
  var d = R(), e2 = yi(a2), f2 = mh(d, e2);
  f2.payload = b;
  void 0 !== c2 && null !== c2 && (f2.callback = c2);
  b = nh(a2, f2, e2);
  null !== b && (gi(b, a2, e2, d), oh(b, a2, e2));
}, enqueueReplaceState: function(a2, b, c2) {
  a2 = a2._reactInternals;
  var d = R(), e2 = yi(a2), f2 = mh(d, e2);
  f2.tag = 1;
  f2.payload = b;
  void 0 !== c2 && null !== c2 && (f2.callback = c2);
  b = nh(a2, f2, e2);
  null !== b && (gi(b, a2, e2, d), oh(b, a2, e2));
}, enqueueForceUpdate: function(a2, b) {
  a2 = a2._reactInternals;
  var c2 = R(), d = yi(a2), e2 = mh(c2, d);
  e2.tag = 2;
  void 0 !== b && null !== b && (e2.callback = b);
  b = nh(a2, e2, d);
  null !== b && (gi(b, a2, d, c2), oh(b, a2, d));
} };
function Fi(a2, b, c2, d, e2, f2, g) {
  a2 = a2.stateNode;
  return "function" === typeof a2.shouldComponentUpdate ? a2.shouldComponentUpdate(d, f2, g) : b.prototype && b.prototype.isPureReactComponent ? !Ie(c2, d) || !Ie(e2, f2) : true;
}
function Gi(a2, b, c2) {
  var d = false, e2 = Vf;
  var f2 = b.contextType;
  "object" === typeof f2 && null !== f2 ? f2 = eh(f2) : (e2 = Zf(b) ? Xf : H.current, d = b.contextTypes, f2 = (d = null !== d && void 0 !== d) ? Yf(a2, e2) : Vf);
  b = new b(c2, f2);
  a2.memoizedState = null !== b.state && void 0 !== b.state ? b.state : null;
  b.updater = Ei;
  a2.stateNode = b;
  b._reactInternals = a2;
  d && (a2 = a2.stateNode, a2.__reactInternalMemoizedUnmaskedChildContext = e2, a2.__reactInternalMemoizedMaskedChildContext = f2);
  return b;
}
function Hi(a2, b, c2, d) {
  a2 = b.state;
  "function" === typeof b.componentWillReceiveProps && b.componentWillReceiveProps(c2, d);
  "function" === typeof b.UNSAFE_componentWillReceiveProps && b.UNSAFE_componentWillReceiveProps(c2, d);
  b.state !== a2 && Ei.enqueueReplaceState(b, b.state, null);
}
function Ii(a2, b, c2, d) {
  var e2 = a2.stateNode;
  e2.props = c2;
  e2.state = a2.memoizedState;
  e2.refs = {};
  kh(a2);
  var f2 = b.contextType;
  "object" === typeof f2 && null !== f2 ? e2.context = eh(f2) : (f2 = Zf(b) ? Xf : H.current, e2.context = Yf(a2, f2));
  e2.state = a2.memoizedState;
  f2 = b.getDerivedStateFromProps;
  "function" === typeof f2 && (Di(a2, b, f2, c2), e2.state = a2.memoizedState);
  "function" === typeof b.getDerivedStateFromProps || "function" === typeof e2.getSnapshotBeforeUpdate || "function" !== typeof e2.UNSAFE_componentWillMount && "function" !== typeof e2.componentWillMount || (b = e2.state, "function" === typeof e2.componentWillMount && e2.componentWillMount(), "function" === typeof e2.UNSAFE_componentWillMount && e2.UNSAFE_componentWillMount(), b !== e2.state && Ei.enqueueReplaceState(e2, e2.state, null), qh(a2, c2, e2, d), e2.state = a2.memoizedState);
  "function" === typeof e2.componentDidMount && (a2.flags |= 4194308);
}
function Ji(a2, b) {
  try {
    var c2 = "", d = b;
    do
      c2 += Pa(d), d = d.return;
    while (d);
    var e2 = c2;
  } catch (f2) {
    e2 = "\nError generating stack: " + f2.message + "\n" + f2.stack;
  }
  return { value: a2, source: b, stack: e2, digest: null };
}
function Ki(a2, b, c2) {
  return { value: a2, source: null, stack: null != c2 ? c2 : null, digest: null != b ? b : null };
}
function Li(a2, b) {
  try {
    console.error(b.value);
  } catch (c2) {
    setTimeout(function() {
      throw c2;
    });
  }
}
var Mi = "function" === typeof WeakMap ? WeakMap : Map;
function Ni(a2, b, c2) {
  c2 = mh(-1, c2);
  c2.tag = 3;
  c2.payload = { element: null };
  var d = b.value;
  c2.callback = function() {
    Oi || (Oi = true, Pi = d);
    Li(a2, b);
  };
  return c2;
}
function Qi(a2, b, c2) {
  c2 = mh(-1, c2);
  c2.tag = 3;
  var d = a2.type.getDerivedStateFromError;
  if ("function" === typeof d) {
    var e2 = b.value;
    c2.payload = function() {
      return d(e2);
    };
    c2.callback = function() {
      Li(a2, b);
    };
  }
  var f2 = a2.stateNode;
  null !== f2 && "function" === typeof f2.componentDidCatch && (c2.callback = function() {
    Li(a2, b);
    "function" !== typeof d && (null === Ri ? Ri = /* @__PURE__ */ new Set([this]) : Ri.add(this));
    var c3 = b.stack;
    this.componentDidCatch(b.value, { componentStack: null !== c3 ? c3 : "" });
  });
  return c2;
}
function Si(a2, b, c2) {
  var d = a2.pingCache;
  if (null === d) {
    d = a2.pingCache = new Mi();
    var e2 = /* @__PURE__ */ new Set();
    d.set(b, e2);
  } else e2 = d.get(b), void 0 === e2 && (e2 = /* @__PURE__ */ new Set(), d.set(b, e2));
  e2.has(c2) || (e2.add(c2), a2 = Ti.bind(null, a2, b, c2), b.then(a2, a2));
}
function Ui(a2) {
  do {
    var b;
    if (b = 13 === a2.tag) b = a2.memoizedState, b = null !== b ? null !== b.dehydrated ? true : false : true;
    if (b) return a2;
    a2 = a2.return;
  } while (null !== a2);
  return null;
}
function Vi(a2, b, c2, d, e2) {
  if (0 === (a2.mode & 1)) return a2 === b ? a2.flags |= 65536 : (a2.flags |= 128, c2.flags |= 131072, c2.flags &= -52805, 1 === c2.tag && (null === c2.alternate ? c2.tag = 17 : (b = mh(-1, 1), b.tag = 2, nh(c2, b, 1))), c2.lanes |= 1), a2;
  a2.flags |= 65536;
  a2.lanes = e2;
  return a2;
}
var Wi = ua.ReactCurrentOwner, dh = false;
function Xi(a2, b, c2, d) {
  b.child = null === a2 ? Vg(b, null, c2, d) : Ug(b, a2.child, c2, d);
}
function Yi(a2, b, c2, d, e2) {
  c2 = c2.render;
  var f2 = b.ref;
  ch(b, e2);
  d = Nh(a2, b, c2, d, f2, e2);
  c2 = Sh();
  if (null !== a2 && !dh) return b.updateQueue = a2.updateQueue, b.flags &= -2053, a2.lanes &= ~e2, Zi(a2, b, e2);
  I$1 && c2 && vg(b);
  b.flags |= 1;
  Xi(a2, b, d, e2);
  return b.child;
}
function $i(a2, b, c2, d, e2) {
  if (null === a2) {
    var f2 = c2.type;
    if ("function" === typeof f2 && !aj(f2) && void 0 === f2.defaultProps && null === c2.compare && void 0 === c2.defaultProps) return b.tag = 15, b.type = f2, bj(a2, b, f2, d, e2);
    a2 = Rg(c2.type, null, d, b, b.mode, e2);
    a2.ref = b.ref;
    a2.return = b;
    return b.child = a2;
  }
  f2 = a2.child;
  if (0 === (a2.lanes & e2)) {
    var g = f2.memoizedProps;
    c2 = c2.compare;
    c2 = null !== c2 ? c2 : Ie;
    if (c2(g, d) && a2.ref === b.ref) return Zi(a2, b, e2);
  }
  b.flags |= 1;
  a2 = Pg(f2, d);
  a2.ref = b.ref;
  a2.return = b;
  return b.child = a2;
}
function bj(a2, b, c2, d, e2) {
  if (null !== a2) {
    var f2 = a2.memoizedProps;
    if (Ie(f2, d) && a2.ref === b.ref) if (dh = false, b.pendingProps = d = f2, 0 !== (a2.lanes & e2)) 0 !== (a2.flags & 131072) && (dh = true);
    else return b.lanes = a2.lanes, Zi(a2, b, e2);
  }
  return cj(a2, b, c2, d, e2);
}
function dj(a2, b, c2) {
  var d = b.pendingProps, e2 = d.children, f2 = null !== a2 ? a2.memoizedState : null;
  if ("hidden" === d.mode) if (0 === (b.mode & 1)) b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, G(ej, fj), fj |= c2;
  else {
    if (0 === (c2 & 1073741824)) return a2 = null !== f2 ? f2.baseLanes | c2 : c2, b.lanes = b.childLanes = 1073741824, b.memoizedState = { baseLanes: a2, cachePool: null, transitions: null }, b.updateQueue = null, G(ej, fj), fj |= a2, null;
    b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null };
    d = null !== f2 ? f2.baseLanes : c2;
    G(ej, fj);
    fj |= d;
  }
  else null !== f2 ? (d = f2.baseLanes | c2, b.memoizedState = null) : d = c2, G(ej, fj), fj |= d;
  Xi(a2, b, e2, c2);
  return b.child;
}
function gj(a2, b) {
  var c2 = b.ref;
  if (null === a2 && null !== c2 || null !== a2 && a2.ref !== c2) b.flags |= 512, b.flags |= 2097152;
}
function cj(a2, b, c2, d, e2) {
  var f2 = Zf(c2) ? Xf : H.current;
  f2 = Yf(b, f2);
  ch(b, e2);
  c2 = Nh(a2, b, c2, d, f2, e2);
  d = Sh();
  if (null !== a2 && !dh) return b.updateQueue = a2.updateQueue, b.flags &= -2053, a2.lanes &= ~e2, Zi(a2, b, e2);
  I$1 && d && vg(b);
  b.flags |= 1;
  Xi(a2, b, c2, e2);
  return b.child;
}
function hj(a2, b, c2, d, e2) {
  if (Zf(c2)) {
    var f2 = true;
    cg(b);
  } else f2 = false;
  ch(b, e2);
  if (null === b.stateNode) ij(a2, b), Gi(b, c2, d), Ii(b, c2, d, e2), d = true;
  else if (null === a2) {
    var g = b.stateNode, h = b.memoizedProps;
    g.props = h;
    var k2 = g.context, l2 = c2.contextType;
    "object" === typeof l2 && null !== l2 ? l2 = eh(l2) : (l2 = Zf(c2) ? Xf : H.current, l2 = Yf(b, l2));
    var m2 = c2.getDerivedStateFromProps, q2 = "function" === typeof m2 || "function" === typeof g.getSnapshotBeforeUpdate;
    q2 || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== d || k2 !== l2) && Hi(b, g, d, l2);
    jh = false;
    var r2 = b.memoizedState;
    g.state = r2;
    qh(b, d, g, e2);
    k2 = b.memoizedState;
    h !== d || r2 !== k2 || Wf.current || jh ? ("function" === typeof m2 && (Di(b, c2, m2, d), k2 = b.memoizedState), (h = jh || Fi(b, c2, h, d, r2, k2, l2)) ? (q2 || "function" !== typeof g.UNSAFE_componentWillMount && "function" !== typeof g.componentWillMount || ("function" === typeof g.componentWillMount && g.componentWillMount(), "function" === typeof g.UNSAFE_componentWillMount && g.UNSAFE_componentWillMount()), "function" === typeof g.componentDidMount && (b.flags |= 4194308)) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), b.memoizedProps = d, b.memoizedState = k2), g.props = d, g.state = k2, g.context = l2, d = h) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), d = false);
  } else {
    g = b.stateNode;
    lh(a2, b);
    h = b.memoizedProps;
    l2 = b.type === b.elementType ? h : Ci(b.type, h);
    g.props = l2;
    q2 = b.pendingProps;
    r2 = g.context;
    k2 = c2.contextType;
    "object" === typeof k2 && null !== k2 ? k2 = eh(k2) : (k2 = Zf(c2) ? Xf : H.current, k2 = Yf(b, k2));
    var y2 = c2.getDerivedStateFromProps;
    (m2 = "function" === typeof y2 || "function" === typeof g.getSnapshotBeforeUpdate) || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== q2 || r2 !== k2) && Hi(b, g, d, k2);
    jh = false;
    r2 = b.memoizedState;
    g.state = r2;
    qh(b, d, g, e2);
    var n2 = b.memoizedState;
    h !== q2 || r2 !== n2 || Wf.current || jh ? ("function" === typeof y2 && (Di(b, c2, y2, d), n2 = b.memoizedState), (l2 = jh || Fi(b, c2, l2, d, r2, n2, k2) || false) ? (m2 || "function" !== typeof g.UNSAFE_componentWillUpdate && "function" !== typeof g.componentWillUpdate || ("function" === typeof g.componentWillUpdate && g.componentWillUpdate(d, n2, k2), "function" === typeof g.UNSAFE_componentWillUpdate && g.UNSAFE_componentWillUpdate(d, n2, k2)), "function" === typeof g.componentDidUpdate && (b.flags |= 4), "function" === typeof g.getSnapshotBeforeUpdate && (b.flags |= 1024)) : ("function" !== typeof g.componentDidUpdate || h === a2.memoizedProps && r2 === a2.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a2.memoizedProps && r2 === a2.memoizedState || (b.flags |= 1024), b.memoizedProps = d, b.memoizedState = n2), g.props = d, g.state = n2, g.context = k2, d = l2) : ("function" !== typeof g.componentDidUpdate || h === a2.memoizedProps && r2 === a2.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a2.memoizedProps && r2 === a2.memoizedState || (b.flags |= 1024), d = false);
  }
  return jj(a2, b, c2, d, f2, e2);
}
function jj(a2, b, c2, d, e2, f2) {
  gj(a2, b);
  var g = 0 !== (b.flags & 128);
  if (!d && !g) return e2 && dg(b, c2, false), Zi(a2, b, f2);
  d = b.stateNode;
  Wi.current = b;
  var h = g && "function" !== typeof c2.getDerivedStateFromError ? null : d.render();
  b.flags |= 1;
  null !== a2 && g ? (b.child = Ug(b, a2.child, null, f2), b.child = Ug(b, null, h, f2)) : Xi(a2, b, h, f2);
  b.memoizedState = d.state;
  e2 && dg(b, c2, true);
  return b.child;
}
function kj(a2) {
  var b = a2.stateNode;
  b.pendingContext ? ag(a2, b.pendingContext, b.pendingContext !== b.context) : b.context && ag(a2, b.context, false);
  yh(a2, b.containerInfo);
}
function lj(a2, b, c2, d, e2) {
  Ig();
  Jg(e2);
  b.flags |= 256;
  Xi(a2, b, c2, d);
  return b.child;
}
var mj = { dehydrated: null, treeContext: null, retryLane: 0 };
function nj(a2) {
  return { baseLanes: a2, cachePool: null, transitions: null };
}
function oj(a2, b, c2) {
  var d = b.pendingProps, e2 = L.current, f2 = false, g = 0 !== (b.flags & 128), h;
  (h = g) || (h = null !== a2 && null === a2.memoizedState ? false : 0 !== (e2 & 2));
  if (h) f2 = true, b.flags &= -129;
  else if (null === a2 || null !== a2.memoizedState) e2 |= 1;
  G(L, e2 & 1);
  if (null === a2) {
    Eg(b);
    a2 = b.memoizedState;
    if (null !== a2 && (a2 = a2.dehydrated, null !== a2)) return 0 === (b.mode & 1) ? b.lanes = 1 : "$!" === a2.data ? b.lanes = 8 : b.lanes = 1073741824, null;
    g = d.children;
    a2 = d.fallback;
    return f2 ? (d = b.mode, f2 = b.child, g = { mode: "hidden", children: g }, 0 === (d & 1) && null !== f2 ? (f2.childLanes = 0, f2.pendingProps = g) : f2 = pj(g, d, 0, null), a2 = Tg(a2, d, c2, null), f2.return = b, a2.return = b, f2.sibling = a2, b.child = f2, b.child.memoizedState = nj(c2), b.memoizedState = mj, a2) : qj(b, g);
  }
  e2 = a2.memoizedState;
  if (null !== e2 && (h = e2.dehydrated, null !== h)) return rj(a2, b, g, d, h, e2, c2);
  if (f2) {
    f2 = d.fallback;
    g = b.mode;
    e2 = a2.child;
    h = e2.sibling;
    var k2 = { mode: "hidden", children: d.children };
    0 === (g & 1) && b.child !== e2 ? (d = b.child, d.childLanes = 0, d.pendingProps = k2, b.deletions = null) : (d = Pg(e2, k2), d.subtreeFlags = e2.subtreeFlags & 14680064);
    null !== h ? f2 = Pg(h, f2) : (f2 = Tg(f2, g, c2, null), f2.flags |= 2);
    f2.return = b;
    d.return = b;
    d.sibling = f2;
    b.child = d;
    d = f2;
    f2 = b.child;
    g = a2.child.memoizedState;
    g = null === g ? nj(c2) : { baseLanes: g.baseLanes | c2, cachePool: null, transitions: g.transitions };
    f2.memoizedState = g;
    f2.childLanes = a2.childLanes & ~c2;
    b.memoizedState = mj;
    return d;
  }
  f2 = a2.child;
  a2 = f2.sibling;
  d = Pg(f2, { mode: "visible", children: d.children });
  0 === (b.mode & 1) && (d.lanes = c2);
  d.return = b;
  d.sibling = null;
  null !== a2 && (c2 = b.deletions, null === c2 ? (b.deletions = [a2], b.flags |= 16) : c2.push(a2));
  b.child = d;
  b.memoizedState = null;
  return d;
}
function qj(a2, b) {
  b = pj({ mode: "visible", children: b }, a2.mode, 0, null);
  b.return = a2;
  return a2.child = b;
}
function sj(a2, b, c2, d) {
  null !== d && Jg(d);
  Ug(b, a2.child, null, c2);
  a2 = qj(b, b.pendingProps.children);
  a2.flags |= 2;
  b.memoizedState = null;
  return a2;
}
function rj(a2, b, c2, d, e2, f2, g) {
  if (c2) {
    if (b.flags & 256) return b.flags &= -257, d = Ki(Error(p$2(422))), sj(a2, b, g, d);
    if (null !== b.memoizedState) return b.child = a2.child, b.flags |= 128, null;
    f2 = d.fallback;
    e2 = b.mode;
    d = pj({ mode: "visible", children: d.children }, e2, 0, null);
    f2 = Tg(f2, e2, g, null);
    f2.flags |= 2;
    d.return = b;
    f2.return = b;
    d.sibling = f2;
    b.child = d;
    0 !== (b.mode & 1) && Ug(b, a2.child, null, g);
    b.child.memoizedState = nj(g);
    b.memoizedState = mj;
    return f2;
  }
  if (0 === (b.mode & 1)) return sj(a2, b, g, null);
  if ("$!" === e2.data) {
    d = e2.nextSibling && e2.nextSibling.dataset;
    if (d) var h = d.dgst;
    d = h;
    f2 = Error(p$2(419));
    d = Ki(f2, d, void 0);
    return sj(a2, b, g, d);
  }
  h = 0 !== (g & a2.childLanes);
  if (dh || h) {
    d = Q;
    if (null !== d) {
      switch (g & -g) {
        case 4:
          e2 = 2;
          break;
        case 16:
          e2 = 8;
          break;
        case 64:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
        case 67108864:
          e2 = 32;
          break;
        case 536870912:
          e2 = 268435456;
          break;
        default:
          e2 = 0;
      }
      e2 = 0 !== (e2 & (d.suspendedLanes | g)) ? 0 : e2;
      0 !== e2 && e2 !== f2.retryLane && (f2.retryLane = e2, ih(a2, e2), gi(d, a2, e2, -1));
    }
    tj();
    d = Ki(Error(p$2(421)));
    return sj(a2, b, g, d);
  }
  if ("$?" === e2.data) return b.flags |= 128, b.child = a2.child, b = uj.bind(null, a2), e2._reactRetry = b, null;
  a2 = f2.treeContext;
  yg = Lf(e2.nextSibling);
  xg = b;
  I$1 = true;
  zg = null;
  null !== a2 && (og[pg++] = rg, og[pg++] = sg, og[pg++] = qg, rg = a2.id, sg = a2.overflow, qg = b);
  b = qj(b, d.children);
  b.flags |= 4096;
  return b;
}
function vj(a2, b, c2) {
  a2.lanes |= b;
  var d = a2.alternate;
  null !== d && (d.lanes |= b);
  bh(a2.return, b, c2);
}
function wj(a2, b, c2, d, e2) {
  var f2 = a2.memoizedState;
  null === f2 ? a2.memoizedState = { isBackwards: b, rendering: null, renderingStartTime: 0, last: d, tail: c2, tailMode: e2 } : (f2.isBackwards = b, f2.rendering = null, f2.renderingStartTime = 0, f2.last = d, f2.tail = c2, f2.tailMode = e2);
}
function xj(a2, b, c2) {
  var d = b.pendingProps, e2 = d.revealOrder, f2 = d.tail;
  Xi(a2, b, d.children, c2);
  d = L.current;
  if (0 !== (d & 2)) d = d & 1 | 2, b.flags |= 128;
  else {
    if (null !== a2 && 0 !== (a2.flags & 128)) a: for (a2 = b.child; null !== a2; ) {
      if (13 === a2.tag) null !== a2.memoizedState && vj(a2, c2, b);
      else if (19 === a2.tag) vj(a2, c2, b);
      else if (null !== a2.child) {
        a2.child.return = a2;
        a2 = a2.child;
        continue;
      }
      if (a2 === b) break a;
      for (; null === a2.sibling; ) {
        if (null === a2.return || a2.return === b) break a;
        a2 = a2.return;
      }
      a2.sibling.return = a2.return;
      a2 = a2.sibling;
    }
    d &= 1;
  }
  G(L, d);
  if (0 === (b.mode & 1)) b.memoizedState = null;
  else switch (e2) {
    case "forwards":
      c2 = b.child;
      for (e2 = null; null !== c2; ) a2 = c2.alternate, null !== a2 && null === Ch(a2) && (e2 = c2), c2 = c2.sibling;
      c2 = e2;
      null === c2 ? (e2 = b.child, b.child = null) : (e2 = c2.sibling, c2.sibling = null);
      wj(b, false, e2, c2, f2);
      break;
    case "backwards":
      c2 = null;
      e2 = b.child;
      for (b.child = null; null !== e2; ) {
        a2 = e2.alternate;
        if (null !== a2 && null === Ch(a2)) {
          b.child = e2;
          break;
        }
        a2 = e2.sibling;
        e2.sibling = c2;
        c2 = e2;
        e2 = a2;
      }
      wj(b, true, c2, null, f2);
      break;
    case "together":
      wj(b, false, null, null, void 0);
      break;
    default:
      b.memoizedState = null;
  }
  return b.child;
}
function ij(a2, b) {
  0 === (b.mode & 1) && null !== a2 && (a2.alternate = null, b.alternate = null, b.flags |= 2);
}
function Zi(a2, b, c2) {
  null !== a2 && (b.dependencies = a2.dependencies);
  rh |= b.lanes;
  if (0 === (c2 & b.childLanes)) return null;
  if (null !== a2 && b.child !== a2.child) throw Error(p$2(153));
  if (null !== b.child) {
    a2 = b.child;
    c2 = Pg(a2, a2.pendingProps);
    b.child = c2;
    for (c2.return = b; null !== a2.sibling; ) a2 = a2.sibling, c2 = c2.sibling = Pg(a2, a2.pendingProps), c2.return = b;
    c2.sibling = null;
  }
  return b.child;
}
function yj(a2, b, c2) {
  switch (b.tag) {
    case 3:
      kj(b);
      Ig();
      break;
    case 5:
      Ah(b);
      break;
    case 1:
      Zf(b.type) && cg(b);
      break;
    case 4:
      yh(b, b.stateNode.containerInfo);
      break;
    case 10:
      var d = b.type._context, e2 = b.memoizedProps.value;
      G(Wg, d._currentValue);
      d._currentValue = e2;
      break;
    case 13:
      d = b.memoizedState;
      if (null !== d) {
        if (null !== d.dehydrated) return G(L, L.current & 1), b.flags |= 128, null;
        if (0 !== (c2 & b.child.childLanes)) return oj(a2, b, c2);
        G(L, L.current & 1);
        a2 = Zi(a2, b, c2);
        return null !== a2 ? a2.sibling : null;
      }
      G(L, L.current & 1);
      break;
    case 19:
      d = 0 !== (c2 & b.childLanes);
      if (0 !== (a2.flags & 128)) {
        if (d) return xj(a2, b, c2);
        b.flags |= 128;
      }
      e2 = b.memoizedState;
      null !== e2 && (e2.rendering = null, e2.tail = null, e2.lastEffect = null);
      G(L, L.current);
      if (d) break;
      else return null;
    case 22:
    case 23:
      return b.lanes = 0, dj(a2, b, c2);
  }
  return Zi(a2, b, c2);
}
var zj, Aj, Bj, Cj;
zj = function(a2, b) {
  for (var c2 = b.child; null !== c2; ) {
    if (5 === c2.tag || 6 === c2.tag) a2.appendChild(c2.stateNode);
    else if (4 !== c2.tag && null !== c2.child) {
      c2.child.return = c2;
      c2 = c2.child;
      continue;
    }
    if (c2 === b) break;
    for (; null === c2.sibling; ) {
      if (null === c2.return || c2.return === b) return;
      c2 = c2.return;
    }
    c2.sibling.return = c2.return;
    c2 = c2.sibling;
  }
};
Aj = function() {
};
Bj = function(a2, b, c2, d) {
  var e2 = a2.memoizedProps;
  if (e2 !== d) {
    a2 = b.stateNode;
    xh(uh.current);
    var f2 = null;
    switch (c2) {
      case "input":
        e2 = Ya(a2, e2);
        d = Ya(a2, d);
        f2 = [];
        break;
      case "select":
        e2 = A({}, e2, { value: void 0 });
        d = A({}, d, { value: void 0 });
        f2 = [];
        break;
      case "textarea":
        e2 = gb(a2, e2);
        d = gb(a2, d);
        f2 = [];
        break;
      default:
        "function" !== typeof e2.onClick && "function" === typeof d.onClick && (a2.onclick = Bf);
    }
    ub(c2, d);
    var g;
    c2 = null;
    for (l2 in e2) if (!d.hasOwnProperty(l2) && e2.hasOwnProperty(l2) && null != e2[l2]) if ("style" === l2) {
      var h = e2[l2];
      for (g in h) h.hasOwnProperty(g) && (c2 || (c2 = {}), c2[g] = "");
    } else "dangerouslySetInnerHTML" !== l2 && "children" !== l2 && "suppressContentEditableWarning" !== l2 && "suppressHydrationWarning" !== l2 && "autoFocus" !== l2 && (ea.hasOwnProperty(l2) ? f2 || (f2 = []) : (f2 = f2 || []).push(l2, null));
    for (l2 in d) {
      var k2 = d[l2];
      h = null != e2 ? e2[l2] : void 0;
      if (d.hasOwnProperty(l2) && k2 !== h && (null != k2 || null != h)) if ("style" === l2) if (h) {
        for (g in h) !h.hasOwnProperty(g) || k2 && k2.hasOwnProperty(g) || (c2 || (c2 = {}), c2[g] = "");
        for (g in k2) k2.hasOwnProperty(g) && h[g] !== k2[g] && (c2 || (c2 = {}), c2[g] = k2[g]);
      } else c2 || (f2 || (f2 = []), f2.push(
        l2,
        c2
      )), c2 = k2;
      else "dangerouslySetInnerHTML" === l2 ? (k2 = k2 ? k2.__html : void 0, h = h ? h.__html : void 0, null != k2 && h !== k2 && (f2 = f2 || []).push(l2, k2)) : "children" === l2 ? "string" !== typeof k2 && "number" !== typeof k2 || (f2 = f2 || []).push(l2, "" + k2) : "suppressContentEditableWarning" !== l2 && "suppressHydrationWarning" !== l2 && (ea.hasOwnProperty(l2) ? (null != k2 && "onScroll" === l2 && D("scroll", a2), f2 || h === k2 || (f2 = [])) : (f2 = f2 || []).push(l2, k2));
    }
    c2 && (f2 = f2 || []).push("style", c2);
    var l2 = f2;
    if (b.updateQueue = l2) b.flags |= 4;
  }
};
Cj = function(a2, b, c2, d) {
  c2 !== d && (b.flags |= 4);
};
function Dj(a2, b) {
  if (!I$1) switch (a2.tailMode) {
    case "hidden":
      b = a2.tail;
      for (var c2 = null; null !== b; ) null !== b.alternate && (c2 = b), b = b.sibling;
      null === c2 ? a2.tail = null : c2.sibling = null;
      break;
    case "collapsed":
      c2 = a2.tail;
      for (var d = null; null !== c2; ) null !== c2.alternate && (d = c2), c2 = c2.sibling;
      null === d ? b || null === a2.tail ? a2.tail = null : a2.tail.sibling = null : d.sibling = null;
  }
}
function S(a2) {
  var b = null !== a2.alternate && a2.alternate.child === a2.child, c2 = 0, d = 0;
  if (b) for (var e2 = a2.child; null !== e2; ) c2 |= e2.lanes | e2.childLanes, d |= e2.subtreeFlags & 14680064, d |= e2.flags & 14680064, e2.return = a2, e2 = e2.sibling;
  else for (e2 = a2.child; null !== e2; ) c2 |= e2.lanes | e2.childLanes, d |= e2.subtreeFlags, d |= e2.flags, e2.return = a2, e2 = e2.sibling;
  a2.subtreeFlags |= d;
  a2.childLanes = c2;
  return b;
}
function Ej(a2, b, c2) {
  var d = b.pendingProps;
  wg(b);
  switch (b.tag) {
    case 2:
    case 16:
    case 15:
    case 0:
    case 11:
    case 7:
    case 8:
    case 12:
    case 9:
    case 14:
      return S(b), null;
    case 1:
      return Zf(b.type) && $f(), S(b), null;
    case 3:
      d = b.stateNode;
      zh();
      E(Wf);
      E(H);
      Eh();
      d.pendingContext && (d.context = d.pendingContext, d.pendingContext = null);
      if (null === a2 || null === a2.child) Gg(b) ? b.flags |= 4 : null === a2 || a2.memoizedState.isDehydrated && 0 === (b.flags & 256) || (b.flags |= 1024, null !== zg && (Fj(zg), zg = null));
      Aj(a2, b);
      S(b);
      return null;
    case 5:
      Bh(b);
      var e2 = xh(wh.current);
      c2 = b.type;
      if (null !== a2 && null != b.stateNode) Bj(a2, b, c2, d, e2), a2.ref !== b.ref && (b.flags |= 512, b.flags |= 2097152);
      else {
        if (!d) {
          if (null === b.stateNode) throw Error(p$2(166));
          S(b);
          return null;
        }
        a2 = xh(uh.current);
        if (Gg(b)) {
          d = b.stateNode;
          c2 = b.type;
          var f2 = b.memoizedProps;
          d[Of] = b;
          d[Pf] = f2;
          a2 = 0 !== (b.mode & 1);
          switch (c2) {
            case "dialog":
              D("cancel", d);
              D("close", d);
              break;
            case "iframe":
            case "object":
            case "embed":
              D("load", d);
              break;
            case "video":
            case "audio":
              for (e2 = 0; e2 < lf.length; e2++) D(lf[e2], d);
              break;
            case "source":
              D("error", d);
              break;
            case "img":
            case "image":
            case "link":
              D(
                "error",
                d
              );
              D("load", d);
              break;
            case "details":
              D("toggle", d);
              break;
            case "input":
              Za(d, f2);
              D("invalid", d);
              break;
            case "select":
              d._wrapperState = { wasMultiple: !!f2.multiple };
              D("invalid", d);
              break;
            case "textarea":
              hb(d, f2), D("invalid", d);
          }
          ub(c2, f2);
          e2 = null;
          for (var g in f2) if (f2.hasOwnProperty(g)) {
            var h = f2[g];
            "children" === g ? "string" === typeof h ? d.textContent !== h && (true !== f2.suppressHydrationWarning && Af(d.textContent, h, a2), e2 = ["children", h]) : "number" === typeof h && d.textContent !== "" + h && (true !== f2.suppressHydrationWarning && Af(
              d.textContent,
              h,
              a2
            ), e2 = ["children", "" + h]) : ea.hasOwnProperty(g) && null != h && "onScroll" === g && D("scroll", d);
          }
          switch (c2) {
            case "input":
              Va(d);
              db(d, f2, true);
              break;
            case "textarea":
              Va(d);
              jb(d);
              break;
            case "select":
            case "option":
              break;
            default:
              "function" === typeof f2.onClick && (d.onclick = Bf);
          }
          d = e2;
          b.updateQueue = d;
          null !== d && (b.flags |= 4);
        } else {
          g = 9 === e2.nodeType ? e2 : e2.ownerDocument;
          "http://www.w3.org/1999/xhtml" === a2 && (a2 = kb(c2));
          "http://www.w3.org/1999/xhtml" === a2 ? "script" === c2 ? (a2 = g.createElement("div"), a2.innerHTML = "<script><\/script>", a2 = a2.removeChild(a2.firstChild)) : "string" === typeof d.is ? a2 = g.createElement(c2, { is: d.is }) : (a2 = g.createElement(c2), "select" === c2 && (g = a2, d.multiple ? g.multiple = true : d.size && (g.size = d.size))) : a2 = g.createElementNS(a2, c2);
          a2[Of] = b;
          a2[Pf] = d;
          zj(a2, b, false, false);
          b.stateNode = a2;
          a: {
            g = vb(c2, d);
            switch (c2) {
              case "dialog":
                D("cancel", a2);
                D("close", a2);
                e2 = d;
                break;
              case "iframe":
              case "object":
              case "embed":
                D("load", a2);
                e2 = d;
                break;
              case "video":
              case "audio":
                for (e2 = 0; e2 < lf.length; e2++) D(lf[e2], a2);
                e2 = d;
                break;
              case "source":
                D("error", a2);
                e2 = d;
                break;
              case "img":
              case "image":
              case "link":
                D(
                  "error",
                  a2
                );
                D("load", a2);
                e2 = d;
                break;
              case "details":
                D("toggle", a2);
                e2 = d;
                break;
              case "input":
                Za(a2, d);
                e2 = Ya(a2, d);
                D("invalid", a2);
                break;
              case "option":
                e2 = d;
                break;
              case "select":
                a2._wrapperState = { wasMultiple: !!d.multiple };
                e2 = A({}, d, { value: void 0 });
                D("invalid", a2);
                break;
              case "textarea":
                hb(a2, d);
                e2 = gb(a2, d);
                D("invalid", a2);
                break;
              default:
                e2 = d;
            }
            ub(c2, e2);
            h = e2;
            for (f2 in h) if (h.hasOwnProperty(f2)) {
              var k2 = h[f2];
              "style" === f2 ? sb(a2, k2) : "dangerouslySetInnerHTML" === f2 ? (k2 = k2 ? k2.__html : void 0, null != k2 && nb(a2, k2)) : "children" === f2 ? "string" === typeof k2 ? ("textarea" !== c2 || "" !== k2) && ob(a2, k2) : "number" === typeof k2 && ob(a2, "" + k2) : "suppressContentEditableWarning" !== f2 && "suppressHydrationWarning" !== f2 && "autoFocus" !== f2 && (ea.hasOwnProperty(f2) ? null != k2 && "onScroll" === f2 && D("scroll", a2) : null != k2 && ta(a2, f2, k2, g));
            }
            switch (c2) {
              case "input":
                Va(a2);
                db(a2, d, false);
                break;
              case "textarea":
                Va(a2);
                jb(a2);
                break;
              case "option":
                null != d.value && a2.setAttribute("value", "" + Sa(d.value));
                break;
              case "select":
                a2.multiple = !!d.multiple;
                f2 = d.value;
                null != f2 ? fb(a2, !!d.multiple, f2, false) : null != d.defaultValue && fb(
                  a2,
                  !!d.multiple,
                  d.defaultValue,
                  true
                );
                break;
              default:
                "function" === typeof e2.onClick && (a2.onclick = Bf);
            }
            switch (c2) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                d = !!d.autoFocus;
                break a;
              case "img":
                d = true;
                break a;
              default:
                d = false;
            }
          }
          d && (b.flags |= 4);
        }
        null !== b.ref && (b.flags |= 512, b.flags |= 2097152);
      }
      S(b);
      return null;
    case 6:
      if (a2 && null != b.stateNode) Cj(a2, b, a2.memoizedProps, d);
      else {
        if ("string" !== typeof d && null === b.stateNode) throw Error(p$2(166));
        c2 = xh(wh.current);
        xh(uh.current);
        if (Gg(b)) {
          d = b.stateNode;
          c2 = b.memoizedProps;
          d[Of] = b;
          if (f2 = d.nodeValue !== c2) {
            if (a2 = xg, null !== a2) switch (a2.tag) {
              case 3:
                Af(d.nodeValue, c2, 0 !== (a2.mode & 1));
                break;
              case 5:
                true !== a2.memoizedProps.suppressHydrationWarning && Af(d.nodeValue, c2, 0 !== (a2.mode & 1));
            }
          }
          f2 && (b.flags |= 4);
        } else d = (9 === c2.nodeType ? c2 : c2.ownerDocument).createTextNode(d), d[Of] = b, b.stateNode = d;
      }
      S(b);
      return null;
    case 13:
      E(L);
      d = b.memoizedState;
      if (null === a2 || null !== a2.memoizedState && null !== a2.memoizedState.dehydrated) {
        if (I$1 && null !== yg && 0 !== (b.mode & 1) && 0 === (b.flags & 128)) Hg(), Ig(), b.flags |= 98560, f2 = false;
        else if (f2 = Gg(b), null !== d && null !== d.dehydrated) {
          if (null === a2) {
            if (!f2) throw Error(p$2(318));
            f2 = b.memoizedState;
            f2 = null !== f2 ? f2.dehydrated : null;
            if (!f2) throw Error(p$2(317));
            f2[Of] = b;
          } else Ig(), 0 === (b.flags & 128) && (b.memoizedState = null), b.flags |= 4;
          S(b);
          f2 = false;
        } else null !== zg && (Fj(zg), zg = null), f2 = true;
        if (!f2) return b.flags & 65536 ? b : null;
      }
      if (0 !== (b.flags & 128)) return b.lanes = c2, b;
      d = null !== d;
      d !== (null !== a2 && null !== a2.memoizedState) && d && (b.child.flags |= 8192, 0 !== (b.mode & 1) && (null === a2 || 0 !== (L.current & 1) ? 0 === T && (T = 3) : tj()));
      null !== b.updateQueue && (b.flags |= 4);
      S(b);
      return null;
    case 4:
      return zh(), Aj(a2, b), null === a2 && sf(b.stateNode.containerInfo), S(b), null;
    case 10:
      return ah(b.type._context), S(b), null;
    case 17:
      return Zf(b.type) && $f(), S(b), null;
    case 19:
      E(L);
      f2 = b.memoizedState;
      if (null === f2) return S(b), null;
      d = 0 !== (b.flags & 128);
      g = f2.rendering;
      if (null === g) if (d) Dj(f2, false);
      else {
        if (0 !== T || null !== a2 && 0 !== (a2.flags & 128)) for (a2 = b.child; null !== a2; ) {
          g = Ch(a2);
          if (null !== g) {
            b.flags |= 128;
            Dj(f2, false);
            d = g.updateQueue;
            null !== d && (b.updateQueue = d, b.flags |= 4);
            b.subtreeFlags = 0;
            d = c2;
            for (c2 = b.child; null !== c2; ) f2 = c2, a2 = d, f2.flags &= 14680066, g = f2.alternate, null === g ? (f2.childLanes = 0, f2.lanes = a2, f2.child = null, f2.subtreeFlags = 0, f2.memoizedProps = null, f2.memoizedState = null, f2.updateQueue = null, f2.dependencies = null, f2.stateNode = null) : (f2.childLanes = g.childLanes, f2.lanes = g.lanes, f2.child = g.child, f2.subtreeFlags = 0, f2.deletions = null, f2.memoizedProps = g.memoizedProps, f2.memoizedState = g.memoizedState, f2.updateQueue = g.updateQueue, f2.type = g.type, a2 = g.dependencies, f2.dependencies = null === a2 ? null : { lanes: a2.lanes, firstContext: a2.firstContext }), c2 = c2.sibling;
            G(L, L.current & 1 | 2);
            return b.child;
          }
          a2 = a2.sibling;
        }
        null !== f2.tail && B() > Gj && (b.flags |= 128, d = true, Dj(f2, false), b.lanes = 4194304);
      }
      else {
        if (!d) if (a2 = Ch(g), null !== a2) {
          if (b.flags |= 128, d = true, c2 = a2.updateQueue, null !== c2 && (b.updateQueue = c2, b.flags |= 4), Dj(f2, true), null === f2.tail && "hidden" === f2.tailMode && !g.alternate && !I$1) return S(b), null;
        } else 2 * B() - f2.renderingStartTime > Gj && 1073741824 !== c2 && (b.flags |= 128, d = true, Dj(f2, false), b.lanes = 4194304);
        f2.isBackwards ? (g.sibling = b.child, b.child = g) : (c2 = f2.last, null !== c2 ? c2.sibling = g : b.child = g, f2.last = g);
      }
      if (null !== f2.tail) return b = f2.tail, f2.rendering = b, f2.tail = b.sibling, f2.renderingStartTime = B(), b.sibling = null, c2 = L.current, G(L, d ? c2 & 1 | 2 : c2 & 1), b;
      S(b);
      return null;
    case 22:
    case 23:
      return Hj(), d = null !== b.memoizedState, null !== a2 && null !== a2.memoizedState !== d && (b.flags |= 8192), d && 0 !== (b.mode & 1) ? 0 !== (fj & 1073741824) && (S(b), b.subtreeFlags & 6 && (b.flags |= 8192)) : S(b), null;
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(p$2(156, b.tag));
}
function Ij(a2, b) {
  wg(b);
  switch (b.tag) {
    case 1:
      return Zf(b.type) && $f(), a2 = b.flags, a2 & 65536 ? (b.flags = a2 & -65537 | 128, b) : null;
    case 3:
      return zh(), E(Wf), E(H), Eh(), a2 = b.flags, 0 !== (a2 & 65536) && 0 === (a2 & 128) ? (b.flags = a2 & -65537 | 128, b) : null;
    case 5:
      return Bh(b), null;
    case 13:
      E(L);
      a2 = b.memoizedState;
      if (null !== a2 && null !== a2.dehydrated) {
        if (null === b.alternate) throw Error(p$2(340));
        Ig();
      }
      a2 = b.flags;
      return a2 & 65536 ? (b.flags = a2 & -65537 | 128, b) : null;
    case 19:
      return E(L), null;
    case 4:
      return zh(), null;
    case 10:
      return ah(b.type._context), null;
    case 22:
    case 23:
      return Hj(), null;
    case 24:
      return null;
    default:
      return null;
  }
}
var Jj = false, U = false, Kj = "function" === typeof WeakSet ? WeakSet : Set, V = null;
function Lj(a2, b) {
  var c2 = a2.ref;
  if (null !== c2) if ("function" === typeof c2) try {
    c2(null);
  } catch (d) {
    W(a2, b, d);
  }
  else c2.current = null;
}
function Mj(a2, b, c2) {
  try {
    c2();
  } catch (d) {
    W(a2, b, d);
  }
}
var Nj = false;
function Oj(a2, b) {
  Cf = dd;
  a2 = Me();
  if (Ne(a2)) {
    if ("selectionStart" in a2) var c2 = { start: a2.selectionStart, end: a2.selectionEnd };
    else a: {
      c2 = (c2 = a2.ownerDocument) && c2.defaultView || window;
      var d = c2.getSelection && c2.getSelection();
      if (d && 0 !== d.rangeCount) {
        c2 = d.anchorNode;
        var e2 = d.anchorOffset, f2 = d.focusNode;
        d = d.focusOffset;
        try {
          c2.nodeType, f2.nodeType;
        } catch (F2) {
          c2 = null;
          break a;
        }
        var g = 0, h = -1, k2 = -1, l2 = 0, m2 = 0, q2 = a2, r2 = null;
        b: for (; ; ) {
          for (var y2; ; ) {
            q2 !== c2 || 0 !== e2 && 3 !== q2.nodeType || (h = g + e2);
            q2 !== f2 || 0 !== d && 3 !== q2.nodeType || (k2 = g + d);
            3 === q2.nodeType && (g += q2.nodeValue.length);
            if (null === (y2 = q2.firstChild)) break;
            r2 = q2;
            q2 = y2;
          }
          for (; ; ) {
            if (q2 === a2) break b;
            r2 === c2 && ++l2 === e2 && (h = g);
            r2 === f2 && ++m2 === d && (k2 = g);
            if (null !== (y2 = q2.nextSibling)) break;
            q2 = r2;
            r2 = q2.parentNode;
          }
          q2 = y2;
        }
        c2 = -1 === h || -1 === k2 ? null : { start: h, end: k2 };
      } else c2 = null;
    }
    c2 = c2 || { start: 0, end: 0 };
  } else c2 = null;
  Df = { focusedElem: a2, selectionRange: c2 };
  dd = false;
  for (V = b; null !== V; ) if (b = V, a2 = b.child, 0 !== (b.subtreeFlags & 1028) && null !== a2) a2.return = b, V = a2;
  else for (; null !== V; ) {
    b = V;
    try {
      var n2 = b.alternate;
      if (0 !== (b.flags & 1024)) switch (b.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if (null !== n2) {
            var t2 = n2.memoizedProps, J2 = n2.memoizedState, x2 = b.stateNode, w2 = x2.getSnapshotBeforeUpdate(b.elementType === b.type ? t2 : Ci(b.type, t2), J2);
            x2.__reactInternalSnapshotBeforeUpdate = w2;
          }
          break;
        case 3:
          var u2 = b.stateNode.containerInfo;
          1 === u2.nodeType ? u2.textContent = "" : 9 === u2.nodeType && u2.documentElement && u2.removeChild(u2.documentElement);
          break;
        case 5:
        case 6:
        case 4:
        case 17:
          break;
        default:
          throw Error(p$2(163));
      }
    } catch (F2) {
      W(b, b.return, F2);
    }
    a2 = b.sibling;
    if (null !== a2) {
      a2.return = b.return;
      V = a2;
      break;
    }
    V = b.return;
  }
  n2 = Nj;
  Nj = false;
  return n2;
}
function Pj(a2, b, c2) {
  var d = b.updateQueue;
  d = null !== d ? d.lastEffect : null;
  if (null !== d) {
    var e2 = d = d.next;
    do {
      if ((e2.tag & a2) === a2) {
        var f2 = e2.destroy;
        e2.destroy = void 0;
        void 0 !== f2 && Mj(b, c2, f2);
      }
      e2 = e2.next;
    } while (e2 !== d);
  }
}
function Qj(a2, b) {
  b = b.updateQueue;
  b = null !== b ? b.lastEffect : null;
  if (null !== b) {
    var c2 = b = b.next;
    do {
      if ((c2.tag & a2) === a2) {
        var d = c2.create;
        c2.destroy = d();
      }
      c2 = c2.next;
    } while (c2 !== b);
  }
}
function Rj(a2) {
  var b = a2.ref;
  if (null !== b) {
    var c2 = a2.stateNode;
    switch (a2.tag) {
      case 5:
        a2 = c2;
        break;
      default:
        a2 = c2;
    }
    "function" === typeof b ? b(a2) : b.current = a2;
  }
}
function Sj(a2) {
  var b = a2.alternate;
  null !== b && (a2.alternate = null, Sj(b));
  a2.child = null;
  a2.deletions = null;
  a2.sibling = null;
  5 === a2.tag && (b = a2.stateNode, null !== b && (delete b[Of], delete b[Pf], delete b[of], delete b[Qf], delete b[Rf]));
  a2.stateNode = null;
  a2.return = null;
  a2.dependencies = null;
  a2.memoizedProps = null;
  a2.memoizedState = null;
  a2.pendingProps = null;
  a2.stateNode = null;
  a2.updateQueue = null;
}
function Tj(a2) {
  return 5 === a2.tag || 3 === a2.tag || 4 === a2.tag;
}
function Uj(a2) {
  a: for (; ; ) {
    for (; null === a2.sibling; ) {
      if (null === a2.return || Tj(a2.return)) return null;
      a2 = a2.return;
    }
    a2.sibling.return = a2.return;
    for (a2 = a2.sibling; 5 !== a2.tag && 6 !== a2.tag && 18 !== a2.tag; ) {
      if (a2.flags & 2) continue a;
      if (null === a2.child || 4 === a2.tag) continue a;
      else a2.child.return = a2, a2 = a2.child;
    }
    if (!(a2.flags & 2)) return a2.stateNode;
  }
}
function Vj(a2, b, c2) {
  var d = a2.tag;
  if (5 === d || 6 === d) a2 = a2.stateNode, b ? 8 === c2.nodeType ? c2.parentNode.insertBefore(a2, b) : c2.insertBefore(a2, b) : (8 === c2.nodeType ? (b = c2.parentNode, b.insertBefore(a2, c2)) : (b = c2, b.appendChild(a2)), c2 = c2._reactRootContainer, null !== c2 && void 0 !== c2 || null !== b.onclick || (b.onclick = Bf));
  else if (4 !== d && (a2 = a2.child, null !== a2)) for (Vj(a2, b, c2), a2 = a2.sibling; null !== a2; ) Vj(a2, b, c2), a2 = a2.sibling;
}
function Wj(a2, b, c2) {
  var d = a2.tag;
  if (5 === d || 6 === d) a2 = a2.stateNode, b ? c2.insertBefore(a2, b) : c2.appendChild(a2);
  else if (4 !== d && (a2 = a2.child, null !== a2)) for (Wj(a2, b, c2), a2 = a2.sibling; null !== a2; ) Wj(a2, b, c2), a2 = a2.sibling;
}
var X = null, Xj = false;
function Yj(a2, b, c2) {
  for (c2 = c2.child; null !== c2; ) Zj(a2, b, c2), c2 = c2.sibling;
}
function Zj(a2, b, c2) {
  if (lc && "function" === typeof lc.onCommitFiberUnmount) try {
    lc.onCommitFiberUnmount(kc, c2);
  } catch (h) {
  }
  switch (c2.tag) {
    case 5:
      U || Lj(c2, b);
    case 6:
      var d = X, e2 = Xj;
      X = null;
      Yj(a2, b, c2);
      X = d;
      Xj = e2;
      null !== X && (Xj ? (a2 = X, c2 = c2.stateNode, 8 === a2.nodeType ? a2.parentNode.removeChild(c2) : a2.removeChild(c2)) : X.removeChild(c2.stateNode));
      break;
    case 18:
      null !== X && (Xj ? (a2 = X, c2 = c2.stateNode, 8 === a2.nodeType ? Kf(a2.parentNode, c2) : 1 === a2.nodeType && Kf(a2, c2), bd(a2)) : Kf(X, c2.stateNode));
      break;
    case 4:
      d = X;
      e2 = Xj;
      X = c2.stateNode.containerInfo;
      Xj = true;
      Yj(a2, b, c2);
      X = d;
      Xj = e2;
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (!U && (d = c2.updateQueue, null !== d && (d = d.lastEffect, null !== d))) {
        e2 = d = d.next;
        do {
          var f2 = e2, g = f2.destroy;
          f2 = f2.tag;
          void 0 !== g && (0 !== (f2 & 2) ? Mj(c2, b, g) : 0 !== (f2 & 4) && Mj(c2, b, g));
          e2 = e2.next;
        } while (e2 !== d);
      }
      Yj(a2, b, c2);
      break;
    case 1:
      if (!U && (Lj(c2, b), d = c2.stateNode, "function" === typeof d.componentWillUnmount)) try {
        d.props = c2.memoizedProps, d.state = c2.memoizedState, d.componentWillUnmount();
      } catch (h) {
        W(c2, b, h);
      }
      Yj(a2, b, c2);
      break;
    case 21:
      Yj(a2, b, c2);
      break;
    case 22:
      c2.mode & 1 ? (U = (d = U) || null !== c2.memoizedState, Yj(a2, b, c2), U = d) : Yj(a2, b, c2);
      break;
    default:
      Yj(a2, b, c2);
  }
}
function ak(a2) {
  var b = a2.updateQueue;
  if (null !== b) {
    a2.updateQueue = null;
    var c2 = a2.stateNode;
    null === c2 && (c2 = a2.stateNode = new Kj());
    b.forEach(function(b2) {
      var d = bk.bind(null, a2, b2);
      c2.has(b2) || (c2.add(b2), b2.then(d, d));
    });
  }
}
function ck(a2, b) {
  var c2 = b.deletions;
  if (null !== c2) for (var d = 0; d < c2.length; d++) {
    var e2 = c2[d];
    try {
      var f2 = a2, g = b, h = g;
      a: for (; null !== h; ) {
        switch (h.tag) {
          case 5:
            X = h.stateNode;
            Xj = false;
            break a;
          case 3:
            X = h.stateNode.containerInfo;
            Xj = true;
            break a;
          case 4:
            X = h.stateNode.containerInfo;
            Xj = true;
            break a;
        }
        h = h.return;
      }
      if (null === X) throw Error(p$2(160));
      Zj(f2, g, e2);
      X = null;
      Xj = false;
      var k2 = e2.alternate;
      null !== k2 && (k2.return = null);
      e2.return = null;
    } catch (l2) {
      W(e2, b, l2);
    }
  }
  if (b.subtreeFlags & 12854) for (b = b.child; null !== b; ) dk(b, a2), b = b.sibling;
}
function dk(a2, b) {
  var c2 = a2.alternate, d = a2.flags;
  switch (a2.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      ck(b, a2);
      ek(a2);
      if (d & 4) {
        try {
          Pj(3, a2, a2.return), Qj(3, a2);
        } catch (t2) {
          W(a2, a2.return, t2);
        }
        try {
          Pj(5, a2, a2.return);
        } catch (t2) {
          W(a2, a2.return, t2);
        }
      }
      break;
    case 1:
      ck(b, a2);
      ek(a2);
      d & 512 && null !== c2 && Lj(c2, c2.return);
      break;
    case 5:
      ck(b, a2);
      ek(a2);
      d & 512 && null !== c2 && Lj(c2, c2.return);
      if (a2.flags & 32) {
        var e2 = a2.stateNode;
        try {
          ob(e2, "");
        } catch (t2) {
          W(a2, a2.return, t2);
        }
      }
      if (d & 4 && (e2 = a2.stateNode, null != e2)) {
        var f2 = a2.memoizedProps, g = null !== c2 ? c2.memoizedProps : f2, h = a2.type, k2 = a2.updateQueue;
        a2.updateQueue = null;
        if (null !== k2) try {
          "input" === h && "radio" === f2.type && null != f2.name && ab(e2, f2);
          vb(h, g);
          var l2 = vb(h, f2);
          for (g = 0; g < k2.length; g += 2) {
            var m2 = k2[g], q2 = k2[g + 1];
            "style" === m2 ? sb(e2, q2) : "dangerouslySetInnerHTML" === m2 ? nb(e2, q2) : "children" === m2 ? ob(e2, q2) : ta(e2, m2, q2, l2);
          }
          switch (h) {
            case "input":
              bb(e2, f2);
              break;
            case "textarea":
              ib(e2, f2);
              break;
            case "select":
              var r2 = e2._wrapperState.wasMultiple;
              e2._wrapperState.wasMultiple = !!f2.multiple;
              var y2 = f2.value;
              null != y2 ? fb(e2, !!f2.multiple, y2, false) : r2 !== !!f2.multiple && (null != f2.defaultValue ? fb(
                e2,
                !!f2.multiple,
                f2.defaultValue,
                true
              ) : fb(e2, !!f2.multiple, f2.multiple ? [] : "", false));
          }
          e2[Pf] = f2;
        } catch (t2) {
          W(a2, a2.return, t2);
        }
      }
      break;
    case 6:
      ck(b, a2);
      ek(a2);
      if (d & 4) {
        if (null === a2.stateNode) throw Error(p$2(162));
        e2 = a2.stateNode;
        f2 = a2.memoizedProps;
        try {
          e2.nodeValue = f2;
        } catch (t2) {
          W(a2, a2.return, t2);
        }
      }
      break;
    case 3:
      ck(b, a2);
      ek(a2);
      if (d & 4 && null !== c2 && c2.memoizedState.isDehydrated) try {
        bd(b.containerInfo);
      } catch (t2) {
        W(a2, a2.return, t2);
      }
      break;
    case 4:
      ck(b, a2);
      ek(a2);
      break;
    case 13:
      ck(b, a2);
      ek(a2);
      e2 = a2.child;
      e2.flags & 8192 && (f2 = null !== e2.memoizedState, e2.stateNode.isHidden = f2, !f2 || null !== e2.alternate && null !== e2.alternate.memoizedState || (fk = B()));
      d & 4 && ak(a2);
      break;
    case 22:
      m2 = null !== c2 && null !== c2.memoizedState;
      a2.mode & 1 ? (U = (l2 = U) || m2, ck(b, a2), U = l2) : ck(b, a2);
      ek(a2);
      if (d & 8192) {
        l2 = null !== a2.memoizedState;
        if ((a2.stateNode.isHidden = l2) && !m2 && 0 !== (a2.mode & 1)) for (V = a2, m2 = a2.child; null !== m2; ) {
          for (q2 = V = m2; null !== V; ) {
            r2 = V;
            y2 = r2.child;
            switch (r2.tag) {
              case 0:
              case 11:
              case 14:
              case 15:
                Pj(4, r2, r2.return);
                break;
              case 1:
                Lj(r2, r2.return);
                var n2 = r2.stateNode;
                if ("function" === typeof n2.componentWillUnmount) {
                  d = r2;
                  c2 = r2.return;
                  try {
                    b = d, n2.props = b.memoizedProps, n2.state = b.memoizedState, n2.componentWillUnmount();
                  } catch (t2) {
                    W(d, c2, t2);
                  }
                }
                break;
              case 5:
                Lj(r2, r2.return);
                break;
              case 22:
                if (null !== r2.memoizedState) {
                  gk(q2);
                  continue;
                }
            }
            null !== y2 ? (y2.return = r2, V = y2) : gk(q2);
          }
          m2 = m2.sibling;
        }
        a: for (m2 = null, q2 = a2; ; ) {
          if (5 === q2.tag) {
            if (null === m2) {
              m2 = q2;
              try {
                e2 = q2.stateNode, l2 ? (f2 = e2.style, "function" === typeof f2.setProperty ? f2.setProperty("display", "none", "important") : f2.display = "none") : (h = q2.stateNode, k2 = q2.memoizedProps.style, g = void 0 !== k2 && null !== k2 && k2.hasOwnProperty("display") ? k2.display : null, h.style.display = rb("display", g));
              } catch (t2) {
                W(a2, a2.return, t2);
              }
            }
          } else if (6 === q2.tag) {
            if (null === m2) try {
              q2.stateNode.nodeValue = l2 ? "" : q2.memoizedProps;
            } catch (t2) {
              W(a2, a2.return, t2);
            }
          } else if ((22 !== q2.tag && 23 !== q2.tag || null === q2.memoizedState || q2 === a2) && null !== q2.child) {
            q2.child.return = q2;
            q2 = q2.child;
            continue;
          }
          if (q2 === a2) break a;
          for (; null === q2.sibling; ) {
            if (null === q2.return || q2.return === a2) break a;
            m2 === q2 && (m2 = null);
            q2 = q2.return;
          }
          m2 === q2 && (m2 = null);
          q2.sibling.return = q2.return;
          q2 = q2.sibling;
        }
      }
      break;
    case 19:
      ck(b, a2);
      ek(a2);
      d & 4 && ak(a2);
      break;
    case 21:
      break;
    default:
      ck(
        b,
        a2
      ), ek(a2);
  }
}
function ek(a2) {
  var b = a2.flags;
  if (b & 2) {
    try {
      a: {
        for (var c2 = a2.return; null !== c2; ) {
          if (Tj(c2)) {
            var d = c2;
            break a;
          }
          c2 = c2.return;
        }
        throw Error(p$2(160));
      }
      switch (d.tag) {
        case 5:
          var e2 = d.stateNode;
          d.flags & 32 && (ob(e2, ""), d.flags &= -33);
          var f2 = Uj(a2);
          Wj(a2, f2, e2);
          break;
        case 3:
        case 4:
          var g = d.stateNode.containerInfo, h = Uj(a2);
          Vj(a2, h, g);
          break;
        default:
          throw Error(p$2(161));
      }
    } catch (k2) {
      W(a2, a2.return, k2);
    }
    a2.flags &= -3;
  }
  b & 4096 && (a2.flags &= -4097);
}
function hk(a2, b, c2) {
  V = a2;
  ik(a2);
}
function ik(a2, b, c2) {
  for (var d = 0 !== (a2.mode & 1); null !== V; ) {
    var e2 = V, f2 = e2.child;
    if (22 === e2.tag && d) {
      var g = null !== e2.memoizedState || Jj;
      if (!g) {
        var h = e2.alternate, k2 = null !== h && null !== h.memoizedState || U;
        h = Jj;
        var l2 = U;
        Jj = g;
        if ((U = k2) && !l2) for (V = e2; null !== V; ) g = V, k2 = g.child, 22 === g.tag && null !== g.memoizedState ? jk(e2) : null !== k2 ? (k2.return = g, V = k2) : jk(e2);
        for (; null !== f2; ) V = f2, ik(f2), f2 = f2.sibling;
        V = e2;
        Jj = h;
        U = l2;
      }
      kk(a2);
    } else 0 !== (e2.subtreeFlags & 8772) && null !== f2 ? (f2.return = e2, V = f2) : kk(a2);
  }
}
function kk(a2) {
  for (; null !== V; ) {
    var b = V;
    if (0 !== (b.flags & 8772)) {
      var c2 = b.alternate;
      try {
        if (0 !== (b.flags & 8772)) switch (b.tag) {
          case 0:
          case 11:
          case 15:
            U || Qj(5, b);
            break;
          case 1:
            var d = b.stateNode;
            if (b.flags & 4 && !U) if (null === c2) d.componentDidMount();
            else {
              var e2 = b.elementType === b.type ? c2.memoizedProps : Ci(b.type, c2.memoizedProps);
              d.componentDidUpdate(e2, c2.memoizedState, d.__reactInternalSnapshotBeforeUpdate);
            }
            var f2 = b.updateQueue;
            null !== f2 && sh(b, f2, d);
            break;
          case 3:
            var g = b.updateQueue;
            if (null !== g) {
              c2 = null;
              if (null !== b.child) switch (b.child.tag) {
                case 5:
                  c2 = b.child.stateNode;
                  break;
                case 1:
                  c2 = b.child.stateNode;
              }
              sh(b, g, c2);
            }
            break;
          case 5:
            var h = b.stateNode;
            if (null === c2 && b.flags & 4) {
              c2 = h;
              var k2 = b.memoizedProps;
              switch (b.type) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                  k2.autoFocus && c2.focus();
                  break;
                case "img":
                  k2.src && (c2.src = k2.src);
              }
            }
            break;
          case 6:
            break;
          case 4:
            break;
          case 12:
            break;
          case 13:
            if (null === b.memoizedState) {
              var l2 = b.alternate;
              if (null !== l2) {
                var m2 = l2.memoizedState;
                if (null !== m2) {
                  var q2 = m2.dehydrated;
                  null !== q2 && bd(q2);
                }
              }
            }
            break;
          case 19:
          case 17:
          case 21:
          case 22:
          case 23:
          case 25:
            break;
          default:
            throw Error(p$2(163));
        }
        U || b.flags & 512 && Rj(b);
      } catch (r2) {
        W(b, b.return, r2);
      }
    }
    if (b === a2) {
      V = null;
      break;
    }
    c2 = b.sibling;
    if (null !== c2) {
      c2.return = b.return;
      V = c2;
      break;
    }
    V = b.return;
  }
}
function gk(a2) {
  for (; null !== V; ) {
    var b = V;
    if (b === a2) {
      V = null;
      break;
    }
    var c2 = b.sibling;
    if (null !== c2) {
      c2.return = b.return;
      V = c2;
      break;
    }
    V = b.return;
  }
}
function jk(a2) {
  for (; null !== V; ) {
    var b = V;
    try {
      switch (b.tag) {
        case 0:
        case 11:
        case 15:
          var c2 = b.return;
          try {
            Qj(4, b);
          } catch (k2) {
            W(b, c2, k2);
          }
          break;
        case 1:
          var d = b.stateNode;
          if ("function" === typeof d.componentDidMount) {
            var e2 = b.return;
            try {
              d.componentDidMount();
            } catch (k2) {
              W(b, e2, k2);
            }
          }
          var f2 = b.return;
          try {
            Rj(b);
          } catch (k2) {
            W(b, f2, k2);
          }
          break;
        case 5:
          var g = b.return;
          try {
            Rj(b);
          } catch (k2) {
            W(b, g, k2);
          }
      }
    } catch (k2) {
      W(b, b.return, k2);
    }
    if (b === a2) {
      V = null;
      break;
    }
    var h = b.sibling;
    if (null !== h) {
      h.return = b.return;
      V = h;
      break;
    }
    V = b.return;
  }
}
var lk = Math.ceil, mk = ua.ReactCurrentDispatcher, nk = ua.ReactCurrentOwner, ok = ua.ReactCurrentBatchConfig, K = 0, Q = null, Y = null, Z = 0, fj = 0, ej = Uf(0), T = 0, pk = null, rh = 0, qk = 0, rk = 0, sk = null, tk = null, fk = 0, Gj = Infinity, uk = null, Oi = false, Pi = null, Ri = null, vk = false, wk = null, xk = 0, yk = 0, zk = null, Ak = -1, Bk = 0;
function R() {
  return 0 !== (K & 6) ? B() : -1 !== Ak ? Ak : Ak = B();
}
function yi(a2) {
  if (0 === (a2.mode & 1)) return 1;
  if (0 !== (K & 2) && 0 !== Z) return Z & -Z;
  if (null !== Kg.transition) return 0 === Bk && (Bk = yc()), Bk;
  a2 = C;
  if (0 !== a2) return a2;
  a2 = window.event;
  a2 = void 0 === a2 ? 16 : jd(a2.type);
  return a2;
}
function gi(a2, b, c2, d) {
  if (50 < yk) throw yk = 0, zk = null, Error(p$2(185));
  Ac(a2, c2, d);
  if (0 === (K & 2) || a2 !== Q) a2 === Q && (0 === (K & 2) && (qk |= c2), 4 === T && Ck(a2, Z)), Dk(a2, d), 1 === c2 && 0 === K && 0 === (b.mode & 1) && (Gj = B() + 500, fg && jg());
}
function Dk(a2, b) {
  var c2 = a2.callbackNode;
  wc(a2, b);
  var d = uc(a2, a2 === Q ? Z : 0);
  if (0 === d) null !== c2 && bc(c2), a2.callbackNode = null, a2.callbackPriority = 0;
  else if (b = d & -d, a2.callbackPriority !== b) {
    null != c2 && bc(c2);
    if (1 === b) 0 === a2.tag ? ig(Ek.bind(null, a2)) : hg(Ek.bind(null, a2)), Jf(function() {
      0 === (K & 6) && jg();
    }), c2 = null;
    else {
      switch (Dc(d)) {
        case 1:
          c2 = fc;
          break;
        case 4:
          c2 = gc;
          break;
        case 16:
          c2 = hc;
          break;
        case 536870912:
          c2 = jc;
          break;
        default:
          c2 = hc;
      }
      c2 = Fk(c2, Gk.bind(null, a2));
    }
    a2.callbackPriority = b;
    a2.callbackNode = c2;
  }
}
function Gk(a2, b) {
  Ak = -1;
  Bk = 0;
  if (0 !== (K & 6)) throw Error(p$2(327));
  var c2 = a2.callbackNode;
  if (Hk() && a2.callbackNode !== c2) return null;
  var d = uc(a2, a2 === Q ? Z : 0);
  if (0 === d) return null;
  if (0 !== (d & 30) || 0 !== (d & a2.expiredLanes) || b) b = Ik(a2, d);
  else {
    b = d;
    var e2 = K;
    K |= 2;
    var f2 = Jk();
    if (Q !== a2 || Z !== b) uk = null, Gj = B() + 500, Kk(a2, b);
    do
      try {
        Lk();
        break;
      } catch (h) {
        Mk(a2, h);
      }
    while (1);
    $g();
    mk.current = f2;
    K = e2;
    null !== Y ? b = 0 : (Q = null, Z = 0, b = T);
  }
  if (0 !== b) {
    2 === b && (e2 = xc(a2), 0 !== e2 && (d = e2, b = Nk(a2, e2)));
    if (1 === b) throw c2 = pk, Kk(a2, 0), Ck(a2, d), Dk(a2, B()), c2;
    if (6 === b) Ck(a2, d);
    else {
      e2 = a2.current.alternate;
      if (0 === (d & 30) && !Ok(e2) && (b = Ik(a2, d), 2 === b && (f2 = xc(a2), 0 !== f2 && (d = f2, b = Nk(a2, f2))), 1 === b)) throw c2 = pk, Kk(a2, 0), Ck(a2, d), Dk(a2, B()), c2;
      a2.finishedWork = e2;
      a2.finishedLanes = d;
      switch (b) {
        case 0:
        case 1:
          throw Error(p$2(345));
        case 2:
          Pk(a2, tk, uk);
          break;
        case 3:
          Ck(a2, d);
          if ((d & 130023424) === d && (b = fk + 500 - B(), 10 < b)) {
            if (0 !== uc(a2, 0)) break;
            e2 = a2.suspendedLanes;
            if ((e2 & d) !== d) {
              R();
              a2.pingedLanes |= a2.suspendedLanes & e2;
              break;
            }
            a2.timeoutHandle = Ff(Pk.bind(null, a2, tk, uk), b);
            break;
          }
          Pk(a2, tk, uk);
          break;
        case 4:
          Ck(a2, d);
          if ((d & 4194240) === d) break;
          b = a2.eventTimes;
          for (e2 = -1; 0 < d; ) {
            var g = 31 - oc(d);
            f2 = 1 << g;
            g = b[g];
            g > e2 && (e2 = g);
            d &= ~f2;
          }
          d = e2;
          d = B() - d;
          d = (120 > d ? 120 : 480 > d ? 480 : 1080 > d ? 1080 : 1920 > d ? 1920 : 3e3 > d ? 3e3 : 4320 > d ? 4320 : 1960 * lk(d / 1960)) - d;
          if (10 < d) {
            a2.timeoutHandle = Ff(Pk.bind(null, a2, tk, uk), d);
            break;
          }
          Pk(a2, tk, uk);
          break;
        case 5:
          Pk(a2, tk, uk);
          break;
        default:
          throw Error(p$2(329));
      }
    }
  }
  Dk(a2, B());
  return a2.callbackNode === c2 ? Gk.bind(null, a2) : null;
}
function Nk(a2, b) {
  var c2 = sk;
  a2.current.memoizedState.isDehydrated && (Kk(a2, b).flags |= 256);
  a2 = Ik(a2, b);
  2 !== a2 && (b = tk, tk = c2, null !== b && Fj(b));
  return a2;
}
function Fj(a2) {
  null === tk ? tk = a2 : tk.push.apply(tk, a2);
}
function Ok(a2) {
  for (var b = a2; ; ) {
    if (b.flags & 16384) {
      var c2 = b.updateQueue;
      if (null !== c2 && (c2 = c2.stores, null !== c2)) for (var d = 0; d < c2.length; d++) {
        var e2 = c2[d], f2 = e2.getSnapshot;
        e2 = e2.value;
        try {
          if (!He(f2(), e2)) return false;
        } catch (g) {
          return false;
        }
      }
    }
    c2 = b.child;
    if (b.subtreeFlags & 16384 && null !== c2) c2.return = b, b = c2;
    else {
      if (b === a2) break;
      for (; null === b.sibling; ) {
        if (null === b.return || b.return === a2) return true;
        b = b.return;
      }
      b.sibling.return = b.return;
      b = b.sibling;
    }
  }
  return true;
}
function Ck(a2, b) {
  b &= ~rk;
  b &= ~qk;
  a2.suspendedLanes |= b;
  a2.pingedLanes &= ~b;
  for (a2 = a2.expirationTimes; 0 < b; ) {
    var c2 = 31 - oc(b), d = 1 << c2;
    a2[c2] = -1;
    b &= ~d;
  }
}
function Ek(a2) {
  if (0 !== (K & 6)) throw Error(p$2(327));
  Hk();
  var b = uc(a2, 0);
  if (0 === (b & 1)) return Dk(a2, B()), null;
  var c2 = Ik(a2, b);
  if (0 !== a2.tag && 2 === c2) {
    var d = xc(a2);
    0 !== d && (b = d, c2 = Nk(a2, d));
  }
  if (1 === c2) throw c2 = pk, Kk(a2, 0), Ck(a2, b), Dk(a2, B()), c2;
  if (6 === c2) throw Error(p$2(345));
  a2.finishedWork = a2.current.alternate;
  a2.finishedLanes = b;
  Pk(a2, tk, uk);
  Dk(a2, B());
  return null;
}
function Qk(a2, b) {
  var c2 = K;
  K |= 1;
  try {
    return a2(b);
  } finally {
    K = c2, 0 === K && (Gj = B() + 500, fg && jg());
  }
}
function Rk(a2) {
  null !== wk && 0 === wk.tag && 0 === (K & 6) && Hk();
  var b = K;
  K |= 1;
  var c2 = ok.transition, d = C;
  try {
    if (ok.transition = null, C = 1, a2) return a2();
  } finally {
    C = d, ok.transition = c2, K = b, 0 === (K & 6) && jg();
  }
}
function Hj() {
  fj = ej.current;
  E(ej);
}
function Kk(a2, b) {
  a2.finishedWork = null;
  a2.finishedLanes = 0;
  var c2 = a2.timeoutHandle;
  -1 !== c2 && (a2.timeoutHandle = -1, Gf(c2));
  if (null !== Y) for (c2 = Y.return; null !== c2; ) {
    var d = c2;
    wg(d);
    switch (d.tag) {
      case 1:
        d = d.type.childContextTypes;
        null !== d && void 0 !== d && $f();
        break;
      case 3:
        zh();
        E(Wf);
        E(H);
        Eh();
        break;
      case 5:
        Bh(d);
        break;
      case 4:
        zh();
        break;
      case 13:
        E(L);
        break;
      case 19:
        E(L);
        break;
      case 10:
        ah(d.type._context);
        break;
      case 22:
      case 23:
        Hj();
    }
    c2 = c2.return;
  }
  Q = a2;
  Y = a2 = Pg(a2.current, null);
  Z = fj = b;
  T = 0;
  pk = null;
  rk = qk = rh = 0;
  tk = sk = null;
  if (null !== fh) {
    for (b = 0; b < fh.length; b++) if (c2 = fh[b], d = c2.interleaved, null !== d) {
      c2.interleaved = null;
      var e2 = d.next, f2 = c2.pending;
      if (null !== f2) {
        var g = f2.next;
        f2.next = e2;
        d.next = g;
      }
      c2.pending = d;
    }
    fh = null;
  }
  return a2;
}
function Mk(a2, b) {
  do {
    var c2 = Y;
    try {
      $g();
      Fh.current = Rh;
      if (Ih) {
        for (var d = M.memoizedState; null !== d; ) {
          var e2 = d.queue;
          null !== e2 && (e2.pending = null);
          d = d.next;
        }
        Ih = false;
      }
      Hh = 0;
      O = N = M = null;
      Jh = false;
      Kh = 0;
      nk.current = null;
      if (null === c2 || null === c2.return) {
        T = 1;
        pk = b;
        Y = null;
        break;
      }
      a: {
        var f2 = a2, g = c2.return, h = c2, k2 = b;
        b = Z;
        h.flags |= 32768;
        if (null !== k2 && "object" === typeof k2 && "function" === typeof k2.then) {
          var l2 = k2, m2 = h, q2 = m2.tag;
          if (0 === (m2.mode & 1) && (0 === q2 || 11 === q2 || 15 === q2)) {
            var r2 = m2.alternate;
            r2 ? (m2.updateQueue = r2.updateQueue, m2.memoizedState = r2.memoizedState, m2.lanes = r2.lanes) : (m2.updateQueue = null, m2.memoizedState = null);
          }
          var y2 = Ui(g);
          if (null !== y2) {
            y2.flags &= -257;
            Vi(y2, g, h, f2, b);
            y2.mode & 1 && Si(f2, l2, b);
            b = y2;
            k2 = l2;
            var n2 = b.updateQueue;
            if (null === n2) {
              var t2 = /* @__PURE__ */ new Set();
              t2.add(k2);
              b.updateQueue = t2;
            } else n2.add(k2);
            break a;
          } else {
            if (0 === (b & 1)) {
              Si(f2, l2, b);
              tj();
              break a;
            }
            k2 = Error(p$2(426));
          }
        } else if (I$1 && h.mode & 1) {
          var J2 = Ui(g);
          if (null !== J2) {
            0 === (J2.flags & 65536) && (J2.flags |= 256);
            Vi(J2, g, h, f2, b);
            Jg(Ji(k2, h));
            break a;
          }
        }
        f2 = k2 = Ji(k2, h);
        4 !== T && (T = 2);
        null === sk ? sk = [f2] : sk.push(f2);
        f2 = g;
        do {
          switch (f2.tag) {
            case 3:
              f2.flags |= 65536;
              b &= -b;
              f2.lanes |= b;
              var x2 = Ni(f2, k2, b);
              ph(f2, x2);
              break a;
            case 1:
              h = k2;
              var w2 = f2.type, u2 = f2.stateNode;
              if (0 === (f2.flags & 128) && ("function" === typeof w2.getDerivedStateFromError || null !== u2 && "function" === typeof u2.componentDidCatch && (null === Ri || !Ri.has(u2)))) {
                f2.flags |= 65536;
                b &= -b;
                f2.lanes |= b;
                var F2 = Qi(f2, h, b);
                ph(f2, F2);
                break a;
              }
          }
          f2 = f2.return;
        } while (null !== f2);
      }
      Sk(c2);
    } catch (na) {
      b = na;
      Y === c2 && null !== c2 && (Y = c2 = c2.return);
      continue;
    }
    break;
  } while (1);
}
function Jk() {
  var a2 = mk.current;
  mk.current = Rh;
  return null === a2 ? Rh : a2;
}
function tj() {
  if (0 === T || 3 === T || 2 === T) T = 4;
  null === Q || 0 === (rh & 268435455) && 0 === (qk & 268435455) || Ck(Q, Z);
}
function Ik(a2, b) {
  var c2 = K;
  K |= 2;
  var d = Jk();
  if (Q !== a2 || Z !== b) uk = null, Kk(a2, b);
  do
    try {
      Tk();
      break;
    } catch (e2) {
      Mk(a2, e2);
    }
  while (1);
  $g();
  K = c2;
  mk.current = d;
  if (null !== Y) throw Error(p$2(261));
  Q = null;
  Z = 0;
  return T;
}
function Tk() {
  for (; null !== Y; ) Uk(Y);
}
function Lk() {
  for (; null !== Y && !cc(); ) Uk(Y);
}
function Uk(a2) {
  var b = Vk(a2.alternate, a2, fj);
  a2.memoizedProps = a2.pendingProps;
  null === b ? Sk(a2) : Y = b;
  nk.current = null;
}
function Sk(a2) {
  var b = a2;
  do {
    var c2 = b.alternate;
    a2 = b.return;
    if (0 === (b.flags & 32768)) {
      if (c2 = Ej(c2, b, fj), null !== c2) {
        Y = c2;
        return;
      }
    } else {
      c2 = Ij(c2, b);
      if (null !== c2) {
        c2.flags &= 32767;
        Y = c2;
        return;
      }
      if (null !== a2) a2.flags |= 32768, a2.subtreeFlags = 0, a2.deletions = null;
      else {
        T = 6;
        Y = null;
        return;
      }
    }
    b = b.sibling;
    if (null !== b) {
      Y = b;
      return;
    }
    Y = b = a2;
  } while (null !== b);
  0 === T && (T = 5);
}
function Pk(a2, b, c2) {
  var d = C, e2 = ok.transition;
  try {
    ok.transition = null, C = 1, Wk(a2, b, c2, d);
  } finally {
    ok.transition = e2, C = d;
  }
  return null;
}
function Wk(a2, b, c2, d) {
  do
    Hk();
  while (null !== wk);
  if (0 !== (K & 6)) throw Error(p$2(327));
  c2 = a2.finishedWork;
  var e2 = a2.finishedLanes;
  if (null === c2) return null;
  a2.finishedWork = null;
  a2.finishedLanes = 0;
  if (c2 === a2.current) throw Error(p$2(177));
  a2.callbackNode = null;
  a2.callbackPriority = 0;
  var f2 = c2.lanes | c2.childLanes;
  Bc(a2, f2);
  a2 === Q && (Y = Q = null, Z = 0);
  0 === (c2.subtreeFlags & 2064) && 0 === (c2.flags & 2064) || vk || (vk = true, Fk(hc, function() {
    Hk();
    return null;
  }));
  f2 = 0 !== (c2.flags & 15990);
  if (0 !== (c2.subtreeFlags & 15990) || f2) {
    f2 = ok.transition;
    ok.transition = null;
    var g = C;
    C = 1;
    var h = K;
    K |= 4;
    nk.current = null;
    Oj(a2, c2);
    dk(c2, a2);
    Oe(Df);
    dd = !!Cf;
    Df = Cf = null;
    a2.current = c2;
    hk(c2);
    dc();
    K = h;
    C = g;
    ok.transition = f2;
  } else a2.current = c2;
  vk && (vk = false, wk = a2, xk = e2);
  f2 = a2.pendingLanes;
  0 === f2 && (Ri = null);
  mc(c2.stateNode);
  Dk(a2, B());
  if (null !== b) for (d = a2.onRecoverableError, c2 = 0; c2 < b.length; c2++) e2 = b[c2], d(e2.value, { componentStack: e2.stack, digest: e2.digest });
  if (Oi) throw Oi = false, a2 = Pi, Pi = null, a2;
  0 !== (xk & 1) && 0 !== a2.tag && Hk();
  f2 = a2.pendingLanes;
  0 !== (f2 & 1) ? a2 === zk ? yk++ : (yk = 0, zk = a2) : yk = 0;
  jg();
  return null;
}
function Hk() {
  if (null !== wk) {
    var a2 = Dc(xk), b = ok.transition, c2 = C;
    try {
      ok.transition = null;
      C = 16 > a2 ? 16 : a2;
      if (null === wk) var d = false;
      else {
        a2 = wk;
        wk = null;
        xk = 0;
        if (0 !== (K & 6)) throw Error(p$2(331));
        var e2 = K;
        K |= 4;
        for (V = a2.current; null !== V; ) {
          var f2 = V, g = f2.child;
          if (0 !== (V.flags & 16)) {
            var h = f2.deletions;
            if (null !== h) {
              for (var k2 = 0; k2 < h.length; k2++) {
                var l2 = h[k2];
                for (V = l2; null !== V; ) {
                  var m2 = V;
                  switch (m2.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Pj(8, m2, f2);
                  }
                  var q2 = m2.child;
                  if (null !== q2) q2.return = m2, V = q2;
                  else for (; null !== V; ) {
                    m2 = V;
                    var r2 = m2.sibling, y2 = m2.return;
                    Sj(m2);
                    if (m2 === l2) {
                      V = null;
                      break;
                    }
                    if (null !== r2) {
                      r2.return = y2;
                      V = r2;
                      break;
                    }
                    V = y2;
                  }
                }
              }
              var n2 = f2.alternate;
              if (null !== n2) {
                var t2 = n2.child;
                if (null !== t2) {
                  n2.child = null;
                  do {
                    var J2 = t2.sibling;
                    t2.sibling = null;
                    t2 = J2;
                  } while (null !== t2);
                }
              }
              V = f2;
            }
          }
          if (0 !== (f2.subtreeFlags & 2064) && null !== g) g.return = f2, V = g;
          else b: for (; null !== V; ) {
            f2 = V;
            if (0 !== (f2.flags & 2048)) switch (f2.tag) {
              case 0:
              case 11:
              case 15:
                Pj(9, f2, f2.return);
            }
            var x2 = f2.sibling;
            if (null !== x2) {
              x2.return = f2.return;
              V = x2;
              break b;
            }
            V = f2.return;
          }
        }
        var w2 = a2.current;
        for (V = w2; null !== V; ) {
          g = V;
          var u2 = g.child;
          if (0 !== (g.subtreeFlags & 2064) && null !== u2) u2.return = g, V = u2;
          else b: for (g = w2; null !== V; ) {
            h = V;
            if (0 !== (h.flags & 2048)) try {
              switch (h.tag) {
                case 0:
                case 11:
                case 15:
                  Qj(9, h);
              }
            } catch (na) {
              W(h, h.return, na);
            }
            if (h === g) {
              V = null;
              break b;
            }
            var F2 = h.sibling;
            if (null !== F2) {
              F2.return = h.return;
              V = F2;
              break b;
            }
            V = h.return;
          }
        }
        K = e2;
        jg();
        if (lc && "function" === typeof lc.onPostCommitFiberRoot) try {
          lc.onPostCommitFiberRoot(kc, a2);
        } catch (na) {
        }
        d = true;
      }
      return d;
    } finally {
      C = c2, ok.transition = b;
    }
  }
  return false;
}
function Xk(a2, b, c2) {
  b = Ji(c2, b);
  b = Ni(a2, b, 1);
  a2 = nh(a2, b, 1);
  b = R();
  null !== a2 && (Ac(a2, 1, b), Dk(a2, b));
}
function W(a2, b, c2) {
  if (3 === a2.tag) Xk(a2, a2, c2);
  else for (; null !== b; ) {
    if (3 === b.tag) {
      Xk(b, a2, c2);
      break;
    } else if (1 === b.tag) {
      var d = b.stateNode;
      if ("function" === typeof b.type.getDerivedStateFromError || "function" === typeof d.componentDidCatch && (null === Ri || !Ri.has(d))) {
        a2 = Ji(c2, a2);
        a2 = Qi(b, a2, 1);
        b = nh(b, a2, 1);
        a2 = R();
        null !== b && (Ac(b, 1, a2), Dk(b, a2));
        break;
      }
    }
    b = b.return;
  }
}
function Ti(a2, b, c2) {
  var d = a2.pingCache;
  null !== d && d.delete(b);
  b = R();
  a2.pingedLanes |= a2.suspendedLanes & c2;
  Q === a2 && (Z & c2) === c2 && (4 === T || 3 === T && (Z & 130023424) === Z && 500 > B() - fk ? Kk(a2, 0) : rk |= c2);
  Dk(a2, b);
}
function Yk(a2, b) {
  0 === b && (0 === (a2.mode & 1) ? b = 1 : (b = sc, sc <<= 1, 0 === (sc & 130023424) && (sc = 4194304)));
  var c2 = R();
  a2 = ih(a2, b);
  null !== a2 && (Ac(a2, b, c2), Dk(a2, c2));
}
function uj(a2) {
  var b = a2.memoizedState, c2 = 0;
  null !== b && (c2 = b.retryLane);
  Yk(a2, c2);
}
function bk(a2, b) {
  var c2 = 0;
  switch (a2.tag) {
    case 13:
      var d = a2.stateNode;
      var e2 = a2.memoizedState;
      null !== e2 && (c2 = e2.retryLane);
      break;
    case 19:
      d = a2.stateNode;
      break;
    default:
      throw Error(p$2(314));
  }
  null !== d && d.delete(b);
  Yk(a2, c2);
}
var Vk;
Vk = function(a2, b, c2) {
  if (null !== a2) if (a2.memoizedProps !== b.pendingProps || Wf.current) dh = true;
  else {
    if (0 === (a2.lanes & c2) && 0 === (b.flags & 128)) return dh = false, yj(a2, b, c2);
    dh = 0 !== (a2.flags & 131072) ? true : false;
  }
  else dh = false, I$1 && 0 !== (b.flags & 1048576) && ug(b, ng, b.index);
  b.lanes = 0;
  switch (b.tag) {
    case 2:
      var d = b.type;
      ij(a2, b);
      a2 = b.pendingProps;
      var e2 = Yf(b, H.current);
      ch(b, c2);
      e2 = Nh(null, b, d, a2, e2, c2);
      var f2 = Sh();
      b.flags |= 1;
      "object" === typeof e2 && null !== e2 && "function" === typeof e2.render && void 0 === e2.$$typeof ? (b.tag = 1, b.memoizedState = null, b.updateQueue = null, Zf(d) ? (f2 = true, cg(b)) : f2 = false, b.memoizedState = null !== e2.state && void 0 !== e2.state ? e2.state : null, kh(b), e2.updater = Ei, b.stateNode = e2, e2._reactInternals = b, Ii(b, d, a2, c2), b = jj(null, b, d, true, f2, c2)) : (b.tag = 0, I$1 && f2 && vg(b), Xi(null, b, e2, c2), b = b.child);
      return b;
    case 16:
      d = b.elementType;
      a: {
        ij(a2, b);
        a2 = b.pendingProps;
        e2 = d._init;
        d = e2(d._payload);
        b.type = d;
        e2 = b.tag = Zk(d);
        a2 = Ci(d, a2);
        switch (e2) {
          case 0:
            b = cj(null, b, d, a2, c2);
            break a;
          case 1:
            b = hj(null, b, d, a2, c2);
            break a;
          case 11:
            b = Yi(null, b, d, a2, c2);
            break a;
          case 14:
            b = $i(null, b, d, Ci(d.type, a2), c2);
            break a;
        }
        throw Error(p$2(
          306,
          d,
          ""
        ));
      }
      return b;
    case 0:
      return d = b.type, e2 = b.pendingProps, e2 = b.elementType === d ? e2 : Ci(d, e2), cj(a2, b, d, e2, c2);
    case 1:
      return d = b.type, e2 = b.pendingProps, e2 = b.elementType === d ? e2 : Ci(d, e2), hj(a2, b, d, e2, c2);
    case 3:
      a: {
        kj(b);
        if (null === a2) throw Error(p$2(387));
        d = b.pendingProps;
        f2 = b.memoizedState;
        e2 = f2.element;
        lh(a2, b);
        qh(b, d, null, c2);
        var g = b.memoizedState;
        d = g.element;
        if (f2.isDehydrated) if (f2 = { element: d, isDehydrated: false, cache: g.cache, pendingSuspenseBoundaries: g.pendingSuspenseBoundaries, transitions: g.transitions }, b.updateQueue.baseState = f2, b.memoizedState = f2, b.flags & 256) {
          e2 = Ji(Error(p$2(423)), b);
          b = lj(a2, b, d, c2, e2);
          break a;
        } else if (d !== e2) {
          e2 = Ji(Error(p$2(424)), b);
          b = lj(a2, b, d, c2, e2);
          break a;
        } else for (yg = Lf(b.stateNode.containerInfo.firstChild), xg = b, I$1 = true, zg = null, c2 = Vg(b, null, d, c2), b.child = c2; c2; ) c2.flags = c2.flags & -3 | 4096, c2 = c2.sibling;
        else {
          Ig();
          if (d === e2) {
            b = Zi(a2, b, c2);
            break a;
          }
          Xi(a2, b, d, c2);
        }
        b = b.child;
      }
      return b;
    case 5:
      return Ah(b), null === a2 && Eg(b), d = b.type, e2 = b.pendingProps, f2 = null !== a2 ? a2.memoizedProps : null, g = e2.children, Ef(d, e2) ? g = null : null !== f2 && Ef(d, f2) && (b.flags |= 32), gj(a2, b), Xi(a2, b, g, c2), b.child;
    case 6:
      return null === a2 && Eg(b), null;
    case 13:
      return oj(a2, b, c2);
    case 4:
      return yh(b, b.stateNode.containerInfo), d = b.pendingProps, null === a2 ? b.child = Ug(b, null, d, c2) : Xi(a2, b, d, c2), b.child;
    case 11:
      return d = b.type, e2 = b.pendingProps, e2 = b.elementType === d ? e2 : Ci(d, e2), Yi(a2, b, d, e2, c2);
    case 7:
      return Xi(a2, b, b.pendingProps, c2), b.child;
    case 8:
      return Xi(a2, b, b.pendingProps.children, c2), b.child;
    case 12:
      return Xi(a2, b, b.pendingProps.children, c2), b.child;
    case 10:
      a: {
        d = b.type._context;
        e2 = b.pendingProps;
        f2 = b.memoizedProps;
        g = e2.value;
        G(Wg, d._currentValue);
        d._currentValue = g;
        if (null !== f2) if (He(f2.value, g)) {
          if (f2.children === e2.children && !Wf.current) {
            b = Zi(a2, b, c2);
            break a;
          }
        } else for (f2 = b.child, null !== f2 && (f2.return = b); null !== f2; ) {
          var h = f2.dependencies;
          if (null !== h) {
            g = f2.child;
            for (var k2 = h.firstContext; null !== k2; ) {
              if (k2.context === d) {
                if (1 === f2.tag) {
                  k2 = mh(-1, c2 & -c2);
                  k2.tag = 2;
                  var l2 = f2.updateQueue;
                  if (null !== l2) {
                    l2 = l2.shared;
                    var m2 = l2.pending;
                    null === m2 ? k2.next = k2 : (k2.next = m2.next, m2.next = k2);
                    l2.pending = k2;
                  }
                }
                f2.lanes |= c2;
                k2 = f2.alternate;
                null !== k2 && (k2.lanes |= c2);
                bh(
                  f2.return,
                  c2,
                  b
                );
                h.lanes |= c2;
                break;
              }
              k2 = k2.next;
            }
          } else if (10 === f2.tag) g = f2.type === b.type ? null : f2.child;
          else if (18 === f2.tag) {
            g = f2.return;
            if (null === g) throw Error(p$2(341));
            g.lanes |= c2;
            h = g.alternate;
            null !== h && (h.lanes |= c2);
            bh(g, c2, b);
            g = f2.sibling;
          } else g = f2.child;
          if (null !== g) g.return = f2;
          else for (g = f2; null !== g; ) {
            if (g === b) {
              g = null;
              break;
            }
            f2 = g.sibling;
            if (null !== f2) {
              f2.return = g.return;
              g = f2;
              break;
            }
            g = g.return;
          }
          f2 = g;
        }
        Xi(a2, b, e2.children, c2);
        b = b.child;
      }
      return b;
    case 9:
      return e2 = b.type, d = b.pendingProps.children, ch(b, c2), e2 = eh(e2), d = d(e2), b.flags |= 1, Xi(a2, b, d, c2), b.child;
    case 14:
      return d = b.type, e2 = Ci(d, b.pendingProps), e2 = Ci(d.type, e2), $i(a2, b, d, e2, c2);
    case 15:
      return bj(a2, b, b.type, b.pendingProps, c2);
    case 17:
      return d = b.type, e2 = b.pendingProps, e2 = b.elementType === d ? e2 : Ci(d, e2), ij(a2, b), b.tag = 1, Zf(d) ? (a2 = true, cg(b)) : a2 = false, ch(b, c2), Gi(b, d, e2), Ii(b, d, e2, c2), jj(null, b, d, true, a2, c2);
    case 19:
      return xj(a2, b, c2);
    case 22:
      return dj(a2, b, c2);
  }
  throw Error(p$2(156, b.tag));
};
function Fk(a2, b) {
  return ac(a2, b);
}
function $k(a2, b, c2, d) {
  this.tag = a2;
  this.key = c2;
  this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null;
  this.index = 0;
  this.ref = null;
  this.pendingProps = b;
  this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null;
  this.mode = d;
  this.subtreeFlags = this.flags = 0;
  this.deletions = null;
  this.childLanes = this.lanes = 0;
  this.alternate = null;
}
function Bg(a2, b, c2, d) {
  return new $k(a2, b, c2, d);
}
function aj(a2) {
  a2 = a2.prototype;
  return !(!a2 || !a2.isReactComponent);
}
function Zk(a2) {
  if ("function" === typeof a2) return aj(a2) ? 1 : 0;
  if (void 0 !== a2 && null !== a2) {
    a2 = a2.$$typeof;
    if (a2 === Da) return 11;
    if (a2 === Ga) return 14;
  }
  return 2;
}
function Pg(a2, b) {
  var c2 = a2.alternate;
  null === c2 ? (c2 = Bg(a2.tag, b, a2.key, a2.mode), c2.elementType = a2.elementType, c2.type = a2.type, c2.stateNode = a2.stateNode, c2.alternate = a2, a2.alternate = c2) : (c2.pendingProps = b, c2.type = a2.type, c2.flags = 0, c2.subtreeFlags = 0, c2.deletions = null);
  c2.flags = a2.flags & 14680064;
  c2.childLanes = a2.childLanes;
  c2.lanes = a2.lanes;
  c2.child = a2.child;
  c2.memoizedProps = a2.memoizedProps;
  c2.memoizedState = a2.memoizedState;
  c2.updateQueue = a2.updateQueue;
  b = a2.dependencies;
  c2.dependencies = null === b ? null : { lanes: b.lanes, firstContext: b.firstContext };
  c2.sibling = a2.sibling;
  c2.index = a2.index;
  c2.ref = a2.ref;
  return c2;
}
function Rg(a2, b, c2, d, e2, f2) {
  var g = 2;
  d = a2;
  if ("function" === typeof a2) aj(a2) && (g = 1);
  else if ("string" === typeof a2) g = 5;
  else a: switch (a2) {
    case ya:
      return Tg(c2.children, e2, f2, b);
    case za:
      g = 8;
      e2 |= 8;
      break;
    case Aa:
      return a2 = Bg(12, c2, b, e2 | 2), a2.elementType = Aa, a2.lanes = f2, a2;
    case Ea:
      return a2 = Bg(13, c2, b, e2), a2.elementType = Ea, a2.lanes = f2, a2;
    case Fa:
      return a2 = Bg(19, c2, b, e2), a2.elementType = Fa, a2.lanes = f2, a2;
    case Ia:
      return pj(c2, e2, f2, b);
    default:
      if ("object" === typeof a2 && null !== a2) switch (a2.$$typeof) {
        case Ba:
          g = 10;
          break a;
        case Ca:
          g = 9;
          break a;
        case Da:
          g = 11;
          break a;
        case Ga:
          g = 14;
          break a;
        case Ha:
          g = 16;
          d = null;
          break a;
      }
      throw Error(p$2(130, null == a2 ? a2 : typeof a2, ""));
  }
  b = Bg(g, c2, b, e2);
  b.elementType = a2;
  b.type = d;
  b.lanes = f2;
  return b;
}
function Tg(a2, b, c2, d) {
  a2 = Bg(7, a2, d, b);
  a2.lanes = c2;
  return a2;
}
function pj(a2, b, c2, d) {
  a2 = Bg(22, a2, d, b);
  a2.elementType = Ia;
  a2.lanes = c2;
  a2.stateNode = { isHidden: false };
  return a2;
}
function Qg(a2, b, c2) {
  a2 = Bg(6, a2, null, b);
  a2.lanes = c2;
  return a2;
}
function Sg(a2, b, c2) {
  b = Bg(4, null !== a2.children ? a2.children : [], a2.key, b);
  b.lanes = c2;
  b.stateNode = { containerInfo: a2.containerInfo, pendingChildren: null, implementation: a2.implementation };
  return b;
}
function al(a2, b, c2, d, e2) {
  this.tag = b;
  this.containerInfo = a2;
  this.finishedWork = this.pingCache = this.current = this.pendingChildren = null;
  this.timeoutHandle = -1;
  this.callbackNode = this.pendingContext = this.context = null;
  this.callbackPriority = 0;
  this.eventTimes = zc(0);
  this.expirationTimes = zc(-1);
  this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0;
  this.entanglements = zc(0);
  this.identifierPrefix = d;
  this.onRecoverableError = e2;
  this.mutableSourceEagerHydrationData = null;
}
function bl(a2, b, c2, d, e2, f2, g, h, k2) {
  a2 = new al(a2, b, c2, h, k2);
  1 === b ? (b = 1, true === f2 && (b |= 8)) : b = 0;
  f2 = Bg(3, null, null, b);
  a2.current = f2;
  f2.stateNode = a2;
  f2.memoizedState = { element: d, isDehydrated: c2, cache: null, transitions: null, pendingSuspenseBoundaries: null };
  kh(f2);
  return a2;
}
function cl(a2, b, c2) {
  var d = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
  return { $$typeof: wa, key: null == d ? null : "" + d, children: a2, containerInfo: b, implementation: c2 };
}
function dl(a2) {
  if (!a2) return Vf;
  a2 = a2._reactInternals;
  a: {
    if (Vb(a2) !== a2 || 1 !== a2.tag) throw Error(p$2(170));
    var b = a2;
    do {
      switch (b.tag) {
        case 3:
          b = b.stateNode.context;
          break a;
        case 1:
          if (Zf(b.type)) {
            b = b.stateNode.__reactInternalMemoizedMergedChildContext;
            break a;
          }
      }
      b = b.return;
    } while (null !== b);
    throw Error(p$2(171));
  }
  if (1 === a2.tag) {
    var c2 = a2.type;
    if (Zf(c2)) return bg(a2, c2, b);
  }
  return b;
}
function el(a2, b, c2, d, e2, f2, g, h, k2) {
  a2 = bl(c2, d, true, a2, e2, f2, g, h, k2);
  a2.context = dl(null);
  c2 = a2.current;
  d = R();
  e2 = yi(c2);
  f2 = mh(d, e2);
  f2.callback = void 0 !== b && null !== b ? b : null;
  nh(c2, f2, e2);
  a2.current.lanes = e2;
  Ac(a2, e2, d);
  Dk(a2, d);
  return a2;
}
function fl(a2, b, c2, d) {
  var e2 = b.current, f2 = R(), g = yi(e2);
  c2 = dl(c2);
  null === b.context ? b.context = c2 : b.pendingContext = c2;
  b = mh(f2, g);
  b.payload = { element: a2 };
  d = void 0 === d ? null : d;
  null !== d && (b.callback = d);
  a2 = nh(e2, b, g);
  null !== a2 && (gi(a2, e2, g, f2), oh(a2, e2, g));
  return g;
}
function gl(a2) {
  a2 = a2.current;
  if (!a2.child) return null;
  switch (a2.child.tag) {
    case 5:
      return a2.child.stateNode;
    default:
      return a2.child.stateNode;
  }
}
function hl(a2, b) {
  a2 = a2.memoizedState;
  if (null !== a2 && null !== a2.dehydrated) {
    var c2 = a2.retryLane;
    a2.retryLane = 0 !== c2 && c2 < b ? c2 : b;
  }
}
function il(a2, b) {
  hl(a2, b);
  (a2 = a2.alternate) && hl(a2, b);
}
function jl() {
  return null;
}
var kl = "function" === typeof reportError ? reportError : function(a2) {
  console.error(a2);
};
function ll(a2) {
  this._internalRoot = a2;
}
ml.prototype.render = ll.prototype.render = function(a2) {
  var b = this._internalRoot;
  if (null === b) throw Error(p$2(409));
  fl(a2, b, null, null);
};
ml.prototype.unmount = ll.prototype.unmount = function() {
  var a2 = this._internalRoot;
  if (null !== a2) {
    this._internalRoot = null;
    var b = a2.containerInfo;
    Rk(function() {
      fl(null, a2, null, null);
    });
    b[uf] = null;
  }
};
function ml(a2) {
  this._internalRoot = a2;
}
ml.prototype.unstable_scheduleHydration = function(a2) {
  if (a2) {
    var b = Hc();
    a2 = { blockedOn: null, target: a2, priority: b };
    for (var c2 = 0; c2 < Qc.length && 0 !== b && b < Qc[c2].priority; c2++) ;
    Qc.splice(c2, 0, a2);
    0 === c2 && Vc(a2);
  }
};
function nl(a2) {
  return !(!a2 || 1 !== a2.nodeType && 9 !== a2.nodeType && 11 !== a2.nodeType);
}
function ol(a2) {
  return !(!a2 || 1 !== a2.nodeType && 9 !== a2.nodeType && 11 !== a2.nodeType && (8 !== a2.nodeType || " react-mount-point-unstable " !== a2.nodeValue));
}
function pl() {
}
function ql(a2, b, c2, d, e2) {
  if (e2) {
    if ("function" === typeof d) {
      var f2 = d;
      d = function() {
        var a3 = gl(g);
        f2.call(a3);
      };
    }
    var g = el(b, d, a2, 0, null, false, false, "", pl);
    a2._reactRootContainer = g;
    a2[uf] = g.current;
    sf(8 === a2.nodeType ? a2.parentNode : a2);
    Rk();
    return g;
  }
  for (; e2 = a2.lastChild; ) a2.removeChild(e2);
  if ("function" === typeof d) {
    var h = d;
    d = function() {
      var a3 = gl(k2);
      h.call(a3);
    };
  }
  var k2 = bl(a2, 0, false, null, null, false, false, "", pl);
  a2._reactRootContainer = k2;
  a2[uf] = k2.current;
  sf(8 === a2.nodeType ? a2.parentNode : a2);
  Rk(function() {
    fl(b, k2, c2, d);
  });
  return k2;
}
function rl(a2, b, c2, d, e2) {
  var f2 = c2._reactRootContainer;
  if (f2) {
    var g = f2;
    if ("function" === typeof e2) {
      var h = e2;
      e2 = function() {
        var a3 = gl(g);
        h.call(a3);
      };
    }
    fl(b, g, a2, e2);
  } else g = ql(c2, b, a2, e2, d);
  return gl(g);
}
Ec = function(a2) {
  switch (a2.tag) {
    case 3:
      var b = a2.stateNode;
      if (b.current.memoizedState.isDehydrated) {
        var c2 = tc(b.pendingLanes);
        0 !== c2 && (Cc(b, c2 | 1), Dk(b, B()), 0 === (K & 6) && (Gj = B() + 500, jg()));
      }
      break;
    case 13:
      Rk(function() {
        var b2 = ih(a2, 1);
        if (null !== b2) {
          var c3 = R();
          gi(b2, a2, 1, c3);
        }
      }), il(a2, 1);
  }
};
Fc = function(a2) {
  if (13 === a2.tag) {
    var b = ih(a2, 134217728);
    if (null !== b) {
      var c2 = R();
      gi(b, a2, 134217728, c2);
    }
    il(a2, 134217728);
  }
};
Gc = function(a2) {
  if (13 === a2.tag) {
    var b = yi(a2), c2 = ih(a2, b);
    if (null !== c2) {
      var d = R();
      gi(c2, a2, b, d);
    }
    il(a2, b);
  }
};
Hc = function() {
  return C;
};
Ic = function(a2, b) {
  var c2 = C;
  try {
    return C = a2, b();
  } finally {
    C = c2;
  }
};
yb = function(a2, b, c2) {
  switch (b) {
    case "input":
      bb(a2, c2);
      b = c2.name;
      if ("radio" === c2.type && null != b) {
        for (c2 = a2; c2.parentNode; ) c2 = c2.parentNode;
        c2 = c2.querySelectorAll("input[name=" + JSON.stringify("" + b) + '][type="radio"]');
        for (b = 0; b < c2.length; b++) {
          var d = c2[b];
          if (d !== a2 && d.form === a2.form) {
            var e2 = Db(d);
            if (!e2) throw Error(p$2(90));
            Wa(d);
            bb(d, e2);
          }
        }
      }
      break;
    case "textarea":
      ib(a2, c2);
      break;
    case "select":
      b = c2.value, null != b && fb(a2, !!c2.multiple, b, false);
  }
};
Gb = Qk;
Hb = Rk;
var sl = { usingClientEntryPoint: false, Events: [Cb, ue, Db, Eb, Fb, Qk] }, tl = { findFiberByHostInstance: Wc, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" };
var ul = { bundleType: tl.bundleType, version: tl.version, rendererPackageName: tl.rendererPackageName, rendererConfig: tl.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: ua.ReactCurrentDispatcher, findHostInstanceByFiber: function(a2) {
  a2 = Zb(a2);
  return null === a2 ? null : a2.stateNode;
}, findFiberByHostInstance: tl.findFiberByHostInstance || jl, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
  var vl = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!vl.isDisabled && vl.supportsFiber) try {
    kc = vl.inject(ul), lc = vl;
  } catch (a2) {
  }
}
reactDom_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = sl;
reactDom_production_min.createPortal = function(a2, b) {
  var c2 = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
  if (!nl(b)) throw Error(p$2(200));
  return cl(a2, b, null, c2);
};
reactDom_production_min.createRoot = function(a2, b) {
  if (!nl(a2)) throw Error(p$2(299));
  var c2 = false, d = "", e2 = kl;
  null !== b && void 0 !== b && (true === b.unstable_strictMode && (c2 = true), void 0 !== b.identifierPrefix && (d = b.identifierPrefix), void 0 !== b.onRecoverableError && (e2 = b.onRecoverableError));
  b = bl(a2, 1, false, null, null, c2, false, d, e2);
  a2[uf] = b.current;
  sf(8 === a2.nodeType ? a2.parentNode : a2);
  return new ll(b);
};
reactDom_production_min.findDOMNode = function(a2) {
  if (null == a2) return null;
  if (1 === a2.nodeType) return a2;
  var b = a2._reactInternals;
  if (void 0 === b) {
    if ("function" === typeof a2.render) throw Error(p$2(188));
    a2 = Object.keys(a2).join(",");
    throw Error(p$2(268, a2));
  }
  a2 = Zb(b);
  a2 = null === a2 ? null : a2.stateNode;
  return a2;
};
reactDom_production_min.flushSync = function(a2) {
  return Rk(a2);
};
reactDom_production_min.hydrate = function(a2, b, c2) {
  if (!ol(b)) throw Error(p$2(200));
  return rl(null, a2, b, true, c2);
};
reactDom_production_min.hydrateRoot = function(a2, b, c2) {
  if (!nl(a2)) throw Error(p$2(405));
  var d = null != c2 && c2.hydratedSources || null, e2 = false, f2 = "", g = kl;
  null !== c2 && void 0 !== c2 && (true === c2.unstable_strictMode && (e2 = true), void 0 !== c2.identifierPrefix && (f2 = c2.identifierPrefix), void 0 !== c2.onRecoverableError && (g = c2.onRecoverableError));
  b = el(b, null, a2, 1, null != c2 ? c2 : null, e2, false, f2, g);
  a2[uf] = b.current;
  sf(a2);
  if (d) for (a2 = 0; a2 < d.length; a2++) c2 = d[a2], e2 = c2._getVersion, e2 = e2(c2._source), null == b.mutableSourceEagerHydrationData ? b.mutableSourceEagerHydrationData = [c2, e2] : b.mutableSourceEagerHydrationData.push(
    c2,
    e2
  );
  return new ml(b);
};
reactDom_production_min.render = function(a2, b, c2) {
  if (!ol(b)) throw Error(p$2(200));
  return rl(null, a2, b, false, c2);
};
reactDom_production_min.unmountComponentAtNode = function(a2) {
  if (!ol(a2)) throw Error(p$2(40));
  return a2._reactRootContainer ? (Rk(function() {
    rl(null, null, a2, false, function() {
      a2._reactRootContainer = null;
      a2[uf] = null;
    });
  }), true) : false;
};
reactDom_production_min.unstable_batchedUpdates = Qk;
reactDom_production_min.unstable_renderSubtreeIntoContainer = function(a2, b, c2, d) {
  if (!ol(c2)) throw Error(p$2(200));
  if (null == a2 || void 0 === a2._reactInternals) throw Error(p$2(38));
  return rl(a2, b, c2, false, d);
};
reactDom_production_min.version = "18.3.1-next-f1338f8080-20240426";
function checkDCE() {
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") {
    return;
  }
  try {
    __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
  } catch (err) {
    console.error(err);
  }
}
{
  checkDCE();
  reactDom.exports = reactDom_production_min;
}
var reactDomExports = reactDom.exports;
var createRoot;
var m$5 = reactDomExports;
{
  createRoot = m$5.createRoot;
  m$5.hydrateRoot;
}
/**
 * @remix-run/router v1.23.4
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
function _extends$2() {
  return _extends$2 = Object.assign ? Object.assign.bind() : function(n2) {
    for (var e2 = 1; e2 < arguments.length; e2++) {
      var t2 = arguments[e2];
      for (var r2 in t2) ({}).hasOwnProperty.call(t2, r2) && (n2[r2] = t2[r2]);
    }
    return n2;
  }, _extends$2.apply(null, arguments);
}
var Action;
(function(Action2) {
  Action2["Pop"] = "POP";
  Action2["Push"] = "PUSH";
  Action2["Replace"] = "REPLACE";
})(Action || (Action = {}));
const PopStateEventType = "popstate";
function createBrowserHistory(options) {
  if (options === void 0) {
    options = {};
  }
  function createBrowserLocation(window2, globalHistory) {
    let {
      pathname,
      search,
      hash
    } = window2.location;
    return createLocation(
      "",
      {
        pathname,
        search,
        hash
      },
      // state defaults to `null` because `window.history.state` does
      globalHistory.state && globalHistory.state.usr || null,
      globalHistory.state && globalHistory.state.key || "default"
    );
  }
  function createBrowserHref(window2, to) {
    return typeof to === "string" ? to : createPath(to);
  }
  return getUrlBasedHistory(createBrowserLocation, createBrowserHref, null, options);
}
function invariant(value, message) {
  if (value === false || value === null || typeof value === "undefined") {
    throw new Error(message);
  }
}
function warning(cond, message) {
  if (!cond) {
    if (typeof console !== "undefined") console.warn(message);
    try {
      throw new Error(message);
    } catch (e2) {
    }
  }
}
function createKey() {
  return Math.random().toString(36).substr(2, 8);
}
function getHistoryState(location, index2) {
  return {
    usr: location.state,
    key: location.key,
    idx: index2
  };
}
function createLocation(current, to, state, key) {
  if (state === void 0) {
    state = null;
  }
  let location = _extends$2({
    pathname: typeof current === "string" ? current : current.pathname,
    search: "",
    hash: ""
  }, typeof to === "string" ? parsePath(to) : to, {
    state,
    // TODO: This could be cleaned up.  push/replace should probably just take
    // full Locations now and avoid the need to run through this flow at all
    // But that's a pretty big refactor to the current test suite so going to
    // keep as is for the time being and just let any incoming keys take precedence
    key: to && to.key || key || createKey()
  });
  return location;
}
function createPath(_ref) {
  let {
    pathname = "/",
    search = "",
    hash = ""
  } = _ref;
  if (search && search !== "?") pathname += search.charAt(0) === "?" ? search : "?" + search;
  if (hash && hash !== "#") pathname += hash.charAt(0) === "#" ? hash : "#" + hash;
  return pathname;
}
function parsePath(path) {
  let parsedPath = {};
  if (path) {
    let hashIndex = path.indexOf("#");
    if (hashIndex >= 0) {
      parsedPath.hash = path.substr(hashIndex);
      path = path.substr(0, hashIndex);
    }
    let searchIndex = path.indexOf("?");
    if (searchIndex >= 0) {
      parsedPath.search = path.substr(searchIndex);
      path = path.substr(0, searchIndex);
    }
    if (path) {
      parsedPath.pathname = path;
    }
  }
  return parsedPath;
}
function getUrlBasedHistory(getLocation, createHref, validateLocation, options) {
  if (options === void 0) {
    options = {};
  }
  let {
    window: window2 = document.defaultView,
    v5Compat = false
  } = options;
  let globalHistory = window2.history;
  let action = Action.Pop;
  let listener = null;
  let index2 = getIndex();
  if (index2 == null) {
    index2 = 0;
    globalHistory.replaceState(_extends$2({}, globalHistory.state, {
      idx: index2
    }), "");
  }
  function getIndex() {
    let state = globalHistory.state || {
      idx: null
    };
    return state.idx;
  }
  function handlePop() {
    action = Action.Pop;
    let nextIndex = getIndex();
    let delta = nextIndex == null ? null : nextIndex - index2;
    index2 = nextIndex;
    if (listener) {
      listener({
        action,
        location: history.location,
        delta
      });
    }
  }
  function push(to, state) {
    action = Action.Push;
    let location = createLocation(history.location, to, state);
    index2 = getIndex() + 1;
    let historyState = getHistoryState(location, index2);
    let url = history.createHref(location);
    try {
      globalHistory.pushState(historyState, "", url);
    } catch (error) {
      if (error instanceof DOMException && error.name === "DataCloneError") {
        throw error;
      }
      window2.location.assign(url);
    }
    if (v5Compat && listener) {
      listener({
        action,
        location: history.location,
        delta: 1
      });
    }
  }
  function replace(to, state) {
    action = Action.Replace;
    let location = createLocation(history.location, to, state);
    index2 = getIndex();
    let historyState = getHistoryState(location, index2);
    let url = history.createHref(location);
    globalHistory.replaceState(historyState, "", url);
    if (v5Compat && listener) {
      listener({
        action,
        location: history.location,
        delta: 0
      });
    }
  }
  function createURL(to) {
    let base = window2.location.origin !== "null" ? window2.location.origin : window2.location.href;
    let href = typeof to === "string" ? to : createPath(to);
    href = href.replace(/ $/, "%20");
    invariant(base, "No window.location.(origin|href) available to create URL for href: " + href);
    return new URL(href, base);
  }
  let history = {
    get action() {
      return action;
    },
    get location() {
      return getLocation(window2, globalHistory);
    },
    listen(fn) {
      if (listener) {
        throw new Error("A history only accepts one active listener");
      }
      window2.addEventListener(PopStateEventType, handlePop);
      listener = fn;
      return () => {
        window2.removeEventListener(PopStateEventType, handlePop);
        listener = null;
      };
    },
    createHref(to) {
      return createHref(window2, to);
    },
    createURL,
    encodeLocation(to) {
      let url = createURL(to);
      return {
        pathname: url.pathname,
        search: url.search,
        hash: url.hash
      };
    },
    push,
    replace,
    go(n2) {
      return globalHistory.go(n2);
    }
  };
  return history;
}
var ResultType;
(function(ResultType2) {
  ResultType2["data"] = "data";
  ResultType2["deferred"] = "deferred";
  ResultType2["redirect"] = "redirect";
  ResultType2["error"] = "error";
})(ResultType || (ResultType = {}));
function matchRoutes(routes, locationArg, basename) {
  if (basename === void 0) {
    basename = "/";
  }
  return matchRoutesImpl(routes, locationArg, basename);
}
function matchRoutesImpl(routes, locationArg, basename, allowPartial) {
  let location = typeof locationArg === "string" ? parsePath(locationArg) : locationArg;
  let pathname = stripBasename(location.pathname || "/", basename);
  if (pathname == null) {
    return null;
  }
  let branches = flattenRoutes(routes);
  rankRouteBranches(branches);
  let matches = null;
  let decoded = decodePath(pathname);
  for (let i2 = 0; matches == null && i2 < branches.length; ++i2) {
    matches = matchRouteBranch(branches[i2], decoded);
  }
  return matches;
}
function flattenRoutes(routes, branches, parentsMeta, parentPath) {
  if (branches === void 0) {
    branches = [];
  }
  if (parentsMeta === void 0) {
    parentsMeta = [];
  }
  if (parentPath === void 0) {
    parentPath = "";
  }
  let flattenRoute = (route, index2, relativePath) => {
    let meta = {
      relativePath: relativePath === void 0 ? route.path || "" : relativePath,
      caseSensitive: route.caseSensitive === true,
      childrenIndex: index2,
      route
    };
    if (meta.relativePath.startsWith("/")) {
      invariant(meta.relativePath.startsWith(parentPath), 'Absolute route path "' + meta.relativePath + '" nested under path ' + ('"' + parentPath + '" is not valid. An absolute child route path ') + "must start with the combined path of all its parent routes.");
      meta.relativePath = meta.relativePath.slice(parentPath.length);
    }
    let path = joinPaths([parentPath, meta.relativePath]);
    let routesMeta = parentsMeta.concat(meta);
    if (route.children && route.children.length > 0) {
      invariant(
        // Our types know better, but runtime JS may not!
        // @ts-expect-error
        route.index !== true,
        "Index routes must not have child routes. Please remove " + ('all child routes from route path "' + path + '".')
      );
      flattenRoutes(route.children, branches, routesMeta, path);
    }
    if (route.path == null && !route.index) {
      return;
    }
    branches.push({
      path,
      score: computeScore(path, route.index),
      routesMeta
    });
  };
  routes.forEach((route, index2) => {
    var _route$path;
    if (route.path === "" || !((_route$path = route.path) != null && _route$path.includes("?"))) {
      flattenRoute(route, index2);
    } else {
      for (let exploded of explodeOptionalSegments(route.path)) {
        flattenRoute(route, index2, exploded);
      }
    }
  });
  return branches;
}
function explodeOptionalSegments(path) {
  let segments = path.split("/");
  if (segments.length === 0) return [];
  let [first, ...rest] = segments;
  let isOptional = first.endsWith("?");
  let required = first.replace(/\?$/, "");
  if (rest.length === 0) {
    return isOptional ? [required, ""] : [required];
  }
  let restExploded = explodeOptionalSegments(rest.join("/"));
  let result = [];
  result.push(...restExploded.map((subpath) => subpath === "" ? required : [required, subpath].join("/")));
  if (isOptional) {
    result.push(...restExploded);
  }
  return result.map((exploded) => path.startsWith("/") && exploded === "" ? "/" : exploded);
}
function rankRouteBranches(branches) {
  branches.sort((a2, b) => a2.score !== b.score ? b.score - a2.score : compareIndexes(a2.routesMeta.map((meta) => meta.childrenIndex), b.routesMeta.map((meta) => meta.childrenIndex)));
}
const paramRe = /^:[\w-]+$/;
const dynamicSegmentValue = 3;
const indexRouteValue = 2;
const emptySegmentValue = 1;
const staticSegmentValue = 10;
const splatPenalty = -2;
const isSplat = (s2) => s2 === "*";
function computeScore(path, index2) {
  let segments = path.split("/");
  let initialScore = segments.length;
  if (segments.some(isSplat)) {
    initialScore += splatPenalty;
  }
  if (index2) {
    initialScore += indexRouteValue;
  }
  return segments.filter((s2) => !isSplat(s2)).reduce((score, segment) => score + (paramRe.test(segment) ? dynamicSegmentValue : segment === "" ? emptySegmentValue : staticSegmentValue), initialScore);
}
function compareIndexes(a2, b) {
  let siblings = a2.length === b.length && a2.slice(0, -1).every((n2, i2) => n2 === b[i2]);
  return siblings ? (
    // If two routes are siblings, we should try to match the earlier sibling
    // first. This allows people to have fine-grained control over the matching
    // behavior by simply putting routes with identical paths in the order they
    // want them tried.
    a2[a2.length - 1] - b[b.length - 1]
  ) : (
    // Otherwise, it doesn't really make sense to rank non-siblings by index,
    // so they sort equally.
    0
  );
}
function matchRouteBranch(branch, pathname, allowPartial) {
  let {
    routesMeta
  } = branch;
  let matchedParams = {};
  let matchedPathname = "/";
  let matches = [];
  for (let i2 = 0; i2 < routesMeta.length; ++i2) {
    let meta = routesMeta[i2];
    let end = i2 === routesMeta.length - 1;
    let remainingPathname = matchedPathname === "/" ? pathname : pathname.slice(matchedPathname.length) || "/";
    let match = matchPath({
      path: meta.relativePath,
      caseSensitive: meta.caseSensitive,
      end
    }, remainingPathname);
    let route = meta.route;
    if (!match) {
      return null;
    }
    Object.assign(matchedParams, match.params);
    matches.push({
      // TODO: Can this as be avoided?
      params: matchedParams,
      pathname: joinPaths([matchedPathname, match.pathname]),
      pathnameBase: normalizePathname(joinPaths([matchedPathname, match.pathnameBase])),
      route
    });
    if (match.pathnameBase !== "/") {
      matchedPathname = joinPaths([matchedPathname, match.pathnameBase]);
    }
  }
  return matches;
}
function matchPath(pattern, pathname) {
  if (typeof pattern === "string") {
    pattern = {
      path: pattern,
      caseSensitive: false,
      end: true
    };
  }
  let [matcher, compiledParams] = compilePath(pattern.path, pattern.caseSensitive, pattern.end);
  let match = pathname.match(matcher);
  if (!match) return null;
  let matchedPathname = match[0];
  let pathnameBase = matchedPathname.replace(/(.)\/+$/, "$1");
  let captureGroups = match.slice(1);
  let params = compiledParams.reduce((memo, _ref, index2) => {
    let {
      paramName,
      isOptional
    } = _ref;
    if (paramName === "*") {
      let splatValue = captureGroups[index2] || "";
      pathnameBase = matchedPathname.slice(0, matchedPathname.length - splatValue.length).replace(/(.)\/+$/, "$1");
    }
    const value = captureGroups[index2];
    if (isOptional && !value) {
      memo[paramName] = void 0;
    } else {
      memo[paramName] = (value || "").replace(/%2F/g, "/");
    }
    return memo;
  }, {});
  return {
    params,
    pathname: matchedPathname,
    pathnameBase,
    pattern
  };
}
function compilePath(path, caseSensitive, end) {
  if (caseSensitive === void 0) {
    caseSensitive = false;
  }
  if (end === void 0) {
    end = true;
  }
  warning(path === "*" || !path.endsWith("*") || path.endsWith("/*"), 'Route path "' + path + '" will be treated as if it were ' + ('"' + path.replace(/\*$/, "/*") + '" because the `*` character must ') + "always follow a `/` in the pattern. To get rid of this warning, " + ('please change the route path to "' + path.replace(/\*$/, "/*") + '".'));
  let params = [];
  let regexpSource = "^" + path.replace(/\/*\*?$/, "").replace(/^\/*/, "/").replace(/[\\.*+^${}|()[\]]/g, "\\$&").replace(/\/:([\w-]+)(\?)?/g, (_, paramName, isOptional) => {
    params.push({
      paramName,
      isOptional: isOptional != null
    });
    return isOptional ? "/?([^\\/]+)?" : "/([^\\/]+)";
  });
  if (path.endsWith("*")) {
    params.push({
      paramName: "*"
    });
    regexpSource += path === "*" || path === "/*" ? "(.*)$" : "(?:\\/(.+)|\\/*)$";
  } else if (end) {
    regexpSource += "\\/*$";
  } else if (path !== "" && path !== "/") {
    regexpSource += "(?:(?=\\/|$))";
  } else ;
  let matcher = new RegExp(regexpSource, caseSensitive ? void 0 : "i");
  return [matcher, params];
}
function decodePath(value) {
  try {
    return value.split("/").map((v2) => decodeURIComponent(v2).replace(/\//g, "%2F")).join("/");
  } catch (error) {
    warning(false, 'The URL path "' + value + '" could not be decoded because it is is a malformed URL segment. This is probably due to a bad percent ' + ("encoding (" + error + ")."));
    return value;
  }
}
function stripBasename(pathname, basename) {
  if (basename === "/") return pathname;
  if (!pathname.toLowerCase().startsWith(basename.toLowerCase())) {
    return null;
  }
  let startIndex = basename.endsWith("/") ? basename.length - 1 : basename.length;
  let nextChar = pathname.charAt(startIndex);
  if (nextChar && nextChar !== "/") {
    return null;
  }
  return pathname.slice(startIndex) || "/";
}
function resolvePath(to, fromPathname) {
  if (fromPathname === void 0) {
    fromPathname = "/";
  }
  let {
    pathname: toPathname,
    search = "",
    hash = ""
  } = typeof to === "string" ? parsePath(to) : to;
  let pathname;
  if (toPathname) {
    toPathname = removeDoubleSlashes(toPathname);
    if (toPathname.startsWith("/")) {
      pathname = resolvePathname(toPathname.substring(1), "/");
    } else {
      pathname = resolvePathname(toPathname, fromPathname);
    }
  } else {
    pathname = fromPathname;
  }
  return {
    pathname,
    search: normalizeSearch(search),
    hash: normalizeHash(hash)
  };
}
function resolvePathname(relativePath, fromPathname) {
  let segments = fromPathname.replace(/\/+$/, "").split("/");
  let relativeSegments = relativePath.split("/");
  relativeSegments.forEach((segment) => {
    if (segment === "..") {
      if (segments.length > 1) segments.pop();
    } else if (segment !== ".") {
      segments.push(segment);
    }
  });
  return segments.length > 1 ? segments.join("/") : "/";
}
function getInvalidPathError(char, field, dest, path) {
  return "Cannot include a '" + char + "' character in a manually specified " + ("`to." + field + "` field [" + JSON.stringify(path) + "].  Please separate it out to the ") + ("`to." + dest + "` field. Alternatively you may provide the full path as ") + 'a string in <Link to="..."> and the router will parse it for you.';
}
function getPathContributingMatches(matches) {
  return matches.filter((match, index2) => index2 === 0 || match.route.path && match.route.path.length > 0);
}
function getResolveToMatches(matches, v7_relativeSplatPath) {
  let pathMatches = getPathContributingMatches(matches);
  if (v7_relativeSplatPath) {
    return pathMatches.map((match, idx) => idx === pathMatches.length - 1 ? match.pathname : match.pathnameBase);
  }
  return pathMatches.map((match) => match.pathnameBase);
}
function resolveTo(toArg, routePathnames, locationPathname, isPathRelative) {
  if (isPathRelative === void 0) {
    isPathRelative = false;
  }
  let to;
  if (typeof toArg === "string") {
    to = parsePath(toArg);
  } else {
    to = _extends$2({}, toArg);
    invariant(!to.pathname || !to.pathname.includes("?"), getInvalidPathError("?", "pathname", "search", to));
    invariant(!to.pathname || !to.pathname.includes("#"), getInvalidPathError("#", "pathname", "hash", to));
    invariant(!to.search || !to.search.includes("#"), getInvalidPathError("#", "search", "hash", to));
  }
  let isEmptyPath = toArg === "" || to.pathname === "";
  let toPathname = isEmptyPath ? "/" : to.pathname;
  let from;
  if (toPathname == null) {
    from = locationPathname;
  } else {
    let routePathnameIndex = routePathnames.length - 1;
    if (!isPathRelative && toPathname.startsWith("..")) {
      let toSegments = toPathname.split("/");
      while (toSegments[0] === "..") {
        toSegments.shift();
        routePathnameIndex -= 1;
      }
      to.pathname = toSegments.join("/");
    }
    from = routePathnameIndex >= 0 ? routePathnames[routePathnameIndex] : "/";
  }
  let path = resolvePath(to, from);
  let hasExplicitTrailingSlash = toPathname && toPathname !== "/" && toPathname.endsWith("/");
  let hasCurrentTrailingSlash = (isEmptyPath || toPathname === ".") && locationPathname.endsWith("/");
  if (!path.pathname.endsWith("/") && (hasExplicitTrailingSlash || hasCurrentTrailingSlash)) {
    path.pathname += "/";
  }
  return path;
}
const removeDoubleSlashes = (path) => path.replace(/\/\/+/g, "/");
const joinPaths = (paths) => removeDoubleSlashes(paths.join("/"));
const normalizePathname = (pathname) => pathname.replace(/\/+$/, "").replace(/^\/*/, "/");
const normalizeSearch = (search) => !search || search === "?" ? "" : search.startsWith("?") ? search : "?" + search;
const normalizeHash = (hash) => !hash || hash === "#" ? "" : hash.startsWith("#") ? hash : "#" + hash;
function isRouteErrorResponse(error) {
  return error != null && typeof error.status === "number" && typeof error.statusText === "string" && typeof error.internal === "boolean" && "data" in error;
}
const validMutationMethodsArr = ["post", "put", "patch", "delete"];
new Set(validMutationMethodsArr);
const validRequestMethodsArr = ["get", ...validMutationMethodsArr];
new Set(validRequestMethodsArr);
/**
 * React Router v6.30.6
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
function _extends$1() {
  return _extends$1 = Object.assign ? Object.assign.bind() : function(n2) {
    for (var e2 = 1; e2 < arguments.length; e2++) {
      var t2 = arguments[e2];
      for (var r2 in t2) ({}).hasOwnProperty.call(t2, r2) && (n2[r2] = t2[r2]);
    }
    return n2;
  }, _extends$1.apply(null, arguments);
}
const DataRouterContext = /* @__PURE__ */ reactExports.createContext(null);
const DataRouterStateContext = /* @__PURE__ */ reactExports.createContext(null);
const NavigationContext = /* @__PURE__ */ reactExports.createContext(null);
const LocationContext = /* @__PURE__ */ reactExports.createContext(null);
const RouteContext = /* @__PURE__ */ reactExports.createContext({
  outlet: null,
  matches: [],
  isDataRoute: false
});
const RouteErrorContext = /* @__PURE__ */ reactExports.createContext(null);
function useHref(to, _temp) {
  let {
    relative
  } = _temp === void 0 ? {} : _temp;
  !useInRouterContext() ? invariant(false) : void 0;
  let {
    basename,
    navigator: navigator2
  } = reactExports.useContext(NavigationContext);
  let {
    hash,
    pathname,
    search
  } = useResolvedPath(to, {
    relative
  });
  let joinedPathname = pathname;
  if (basename !== "/") {
    joinedPathname = pathname === "/" ? basename : joinPaths([basename, pathname]);
  }
  return navigator2.createHref({
    pathname: joinedPathname,
    search,
    hash
  });
}
function useInRouterContext() {
  return reactExports.useContext(LocationContext) != null;
}
function useLocation() {
  !useInRouterContext() ? invariant(false) : void 0;
  return reactExports.useContext(LocationContext).location;
}
function useIsomorphicLayoutEffect(cb2) {
  let isStatic = reactExports.useContext(NavigationContext).static;
  if (!isStatic) {
    reactExports.useLayoutEffect(cb2);
  }
}
function useNavigate() {
  let {
    isDataRoute
  } = reactExports.useContext(RouteContext);
  return isDataRoute ? useNavigateStable() : useNavigateUnstable();
}
function useNavigateUnstable() {
  !useInRouterContext() ? invariant(false) : void 0;
  let dataRouterContext = reactExports.useContext(DataRouterContext);
  let {
    basename,
    future,
    navigator: navigator2
  } = reactExports.useContext(NavigationContext);
  let {
    matches
  } = reactExports.useContext(RouteContext);
  let {
    pathname: locationPathname
  } = useLocation();
  let routePathnamesJson = JSON.stringify(getResolveToMatches(matches, future.v7_relativeSplatPath));
  let activeRef = reactExports.useRef(false);
  useIsomorphicLayoutEffect(() => {
    activeRef.current = true;
  });
  let navigate = reactExports.useCallback(function(to, options) {
    if (options === void 0) {
      options = {};
    }
    if (!activeRef.current) return;
    if (typeof to === "number") {
      navigator2.go(to);
      return;
    }
    let path = resolveTo(to, JSON.parse(routePathnamesJson), locationPathname, options.relative === "path");
    if (dataRouterContext == null && basename !== "/") {
      path.pathname = path.pathname === "/" ? basename : joinPaths([basename, path.pathname]);
    }
    (!!options.replace ? navigator2.replace : navigator2.push)(path, options.state, options);
  }, [basename, navigator2, routePathnamesJson, locationPathname, dataRouterContext]);
  return navigate;
}
const OutletContext = /* @__PURE__ */ reactExports.createContext(null);
function useOutlet(context) {
  let outlet = reactExports.useContext(RouteContext).outlet;
  if (outlet) {
    return /* @__PURE__ */ reactExports.createElement(OutletContext.Provider, {
      value: context
    }, outlet);
  }
  return outlet;
}
function useResolvedPath(to, _temp2) {
  let {
    relative
  } = _temp2 === void 0 ? {} : _temp2;
  let {
    future
  } = reactExports.useContext(NavigationContext);
  let {
    matches
  } = reactExports.useContext(RouteContext);
  let {
    pathname: locationPathname
  } = useLocation();
  let routePathnamesJson = JSON.stringify(getResolveToMatches(matches, future.v7_relativeSplatPath));
  return reactExports.useMemo(() => resolveTo(to, JSON.parse(routePathnamesJson), locationPathname, relative === "path"), [to, routePathnamesJson, locationPathname, relative]);
}
function useRoutes(routes, locationArg) {
  return useRoutesImpl(routes, locationArg);
}
function useRoutesImpl(routes, locationArg, dataRouterState, future) {
  !useInRouterContext() ? invariant(false) : void 0;
  let {
    navigator: navigator2
  } = reactExports.useContext(NavigationContext);
  let {
    matches: parentMatches
  } = reactExports.useContext(RouteContext);
  let routeMatch = parentMatches[parentMatches.length - 1];
  let parentParams = routeMatch ? routeMatch.params : {};
  routeMatch ? routeMatch.pathname : "/";
  let parentPathnameBase = routeMatch ? routeMatch.pathnameBase : "/";
  routeMatch && routeMatch.route;
  let locationFromContext = useLocation();
  let location;
  if (locationArg) {
    var _parsedLocationArg$pa;
    let parsedLocationArg = typeof locationArg === "string" ? parsePath(locationArg) : locationArg;
    !(parentPathnameBase === "/" || ((_parsedLocationArg$pa = parsedLocationArg.pathname) == null ? void 0 : _parsedLocationArg$pa.startsWith(parentPathnameBase))) ? invariant(false) : void 0;
    location = parsedLocationArg;
  } else {
    location = locationFromContext;
  }
  let pathname = location.pathname || "/";
  let remainingPathname = pathname;
  if (parentPathnameBase !== "/") {
    let parentSegments = parentPathnameBase.replace(/^\//, "").split("/");
    let segments = pathname.replace(/^\//, "").split("/");
    remainingPathname = "/" + segments.slice(parentSegments.length).join("/");
  }
  let matches = matchRoutes(routes, {
    pathname: remainingPathname
  });
  let renderedMatches = _renderMatches(matches && matches.map((match) => Object.assign({}, match, {
    params: Object.assign({}, parentParams, match.params),
    pathname: joinPaths([
      parentPathnameBase,
      // Re-encode pathnames that were decoded inside matchRoutes
      navigator2.encodeLocation ? navigator2.encodeLocation(match.pathname).pathname : match.pathname
    ]),
    pathnameBase: match.pathnameBase === "/" ? parentPathnameBase : joinPaths([
      parentPathnameBase,
      // Re-encode pathnames that were decoded inside matchRoutes
      navigator2.encodeLocation ? navigator2.encodeLocation(match.pathnameBase).pathname : match.pathnameBase
    ])
  })), parentMatches, dataRouterState, future);
  if (locationArg && renderedMatches) {
    return /* @__PURE__ */ reactExports.createElement(LocationContext.Provider, {
      value: {
        location: _extends$1({
          pathname: "/",
          search: "",
          hash: "",
          state: null,
          key: "default"
        }, location),
        navigationType: Action.Pop
      }
    }, renderedMatches);
  }
  return renderedMatches;
}
function DefaultErrorComponent() {
  let error = useRouteError();
  let message = isRouteErrorResponse(error) ? error.status + " " + error.statusText : error instanceof Error ? error.message : JSON.stringify(error);
  let stack = error instanceof Error ? error.stack : null;
  let lightgrey = "rgba(200,200,200, 0.5)";
  let preStyles = {
    padding: "0.5rem",
    backgroundColor: lightgrey
  };
  let devInfo = null;
  return /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("h2", null, "Unexpected Application Error!"), /* @__PURE__ */ reactExports.createElement("h3", {
    style: {
      fontStyle: "italic"
    }
  }, message), stack ? /* @__PURE__ */ reactExports.createElement("pre", {
    style: preStyles
  }, stack) : null, devInfo);
}
const defaultErrorElement = /* @__PURE__ */ reactExports.createElement(DefaultErrorComponent, null);
class RenderErrorBoundary extends reactExports.Component {
  constructor(props) {
    super(props);
    this.state = {
      location: props.location,
      revalidation: props.revalidation,
      error: props.error
    };
  }
  static getDerivedStateFromError(error) {
    return {
      error
    };
  }
  static getDerivedStateFromProps(props, state) {
    if (state.location !== props.location || state.revalidation !== "idle" && props.revalidation === "idle") {
      return {
        error: props.error,
        location: props.location,
        revalidation: props.revalidation
      };
    }
    return {
      error: props.error !== void 0 ? props.error : state.error,
      location: state.location,
      revalidation: props.revalidation || state.revalidation
    };
  }
  componentDidCatch(error, errorInfo) {
    console.error("React Router caught the following error during render", error, errorInfo);
  }
  render() {
    return this.state.error !== void 0 ? /* @__PURE__ */ reactExports.createElement(RouteContext.Provider, {
      value: this.props.routeContext
    }, /* @__PURE__ */ reactExports.createElement(RouteErrorContext.Provider, {
      value: this.state.error,
      children: this.props.component
    })) : this.props.children;
  }
}
function RenderedRoute(_ref) {
  let {
    routeContext,
    match,
    children
  } = _ref;
  let dataRouterContext = reactExports.useContext(DataRouterContext);
  if (dataRouterContext && dataRouterContext.static && dataRouterContext.staticContext && (match.route.errorElement || match.route.ErrorBoundary)) {
    dataRouterContext.staticContext._deepestRenderedBoundaryId = match.route.id;
  }
  return /* @__PURE__ */ reactExports.createElement(RouteContext.Provider, {
    value: routeContext
  }, children);
}
function _renderMatches(matches, parentMatches, dataRouterState, future) {
  var _dataRouterState;
  if (parentMatches === void 0) {
    parentMatches = [];
  }
  if (dataRouterState === void 0) {
    dataRouterState = null;
  }
  if (future === void 0) {
    future = null;
  }
  if (matches == null) {
    var _future;
    if (!dataRouterState) {
      return null;
    }
    if (dataRouterState.errors) {
      matches = dataRouterState.matches;
    } else if ((_future = future) != null && _future.v7_partialHydration && parentMatches.length === 0 && !dataRouterState.initialized && dataRouterState.matches.length > 0) {
      matches = dataRouterState.matches;
    } else {
      return null;
    }
  }
  let renderedMatches = matches;
  let errors = (_dataRouterState = dataRouterState) == null ? void 0 : _dataRouterState.errors;
  if (errors != null) {
    let errorIndex = renderedMatches.findIndex((m2) => m2.route.id && (errors == null ? void 0 : errors[m2.route.id]) !== void 0);
    !(errorIndex >= 0) ? invariant(false) : void 0;
    renderedMatches = renderedMatches.slice(0, Math.min(renderedMatches.length, errorIndex + 1));
  }
  let renderFallback = false;
  let fallbackIndex = -1;
  if (dataRouterState && future && future.v7_partialHydration) {
    for (let i2 = 0; i2 < renderedMatches.length; i2++) {
      let match = renderedMatches[i2];
      if (match.route.HydrateFallback || match.route.hydrateFallbackElement) {
        fallbackIndex = i2;
      }
      if (match.route.id) {
        let {
          loaderData,
          errors: errors2
        } = dataRouterState;
        let needsToRunLoader = match.route.loader && loaderData[match.route.id] === void 0 && (!errors2 || errors2[match.route.id] === void 0);
        if (match.route.lazy || needsToRunLoader) {
          renderFallback = true;
          if (fallbackIndex >= 0) {
            renderedMatches = renderedMatches.slice(0, fallbackIndex + 1);
          } else {
            renderedMatches = [renderedMatches[0]];
          }
          break;
        }
      }
    }
  }
  return renderedMatches.reduceRight((outlet, match, index2) => {
    let error;
    let shouldRenderHydrateFallback = false;
    let errorElement = null;
    let hydrateFallbackElement = null;
    if (dataRouterState) {
      error = errors && match.route.id ? errors[match.route.id] : void 0;
      errorElement = match.route.errorElement || defaultErrorElement;
      if (renderFallback) {
        if (fallbackIndex < 0 && index2 === 0) {
          warningOnce("route-fallback");
          shouldRenderHydrateFallback = true;
          hydrateFallbackElement = null;
        } else if (fallbackIndex === index2) {
          shouldRenderHydrateFallback = true;
          hydrateFallbackElement = match.route.hydrateFallbackElement || null;
        }
      }
    }
    let matches2 = parentMatches.concat(renderedMatches.slice(0, index2 + 1));
    let getChildren = () => {
      let children;
      if (error) {
        children = errorElement;
      } else if (shouldRenderHydrateFallback) {
        children = hydrateFallbackElement;
      } else if (match.route.Component) {
        children = /* @__PURE__ */ reactExports.createElement(match.route.Component, null);
      } else if (match.route.element) {
        children = match.route.element;
      } else {
        children = outlet;
      }
      return /* @__PURE__ */ reactExports.createElement(RenderedRoute, {
        match,
        routeContext: {
          outlet,
          matches: matches2,
          isDataRoute: dataRouterState != null
        },
        children
      });
    };
    return dataRouterState && (match.route.ErrorBoundary || match.route.errorElement || index2 === 0) ? /* @__PURE__ */ reactExports.createElement(RenderErrorBoundary, {
      location: dataRouterState.location,
      revalidation: dataRouterState.revalidation,
      component: errorElement,
      error,
      children: getChildren(),
      routeContext: {
        outlet: null,
        matches: matches2,
        isDataRoute: true
      }
    }) : getChildren();
  }, null);
}
var DataRouterHook$1 = /* @__PURE__ */ function(DataRouterHook2) {
  DataRouterHook2["UseBlocker"] = "useBlocker";
  DataRouterHook2["UseRevalidator"] = "useRevalidator";
  DataRouterHook2["UseNavigateStable"] = "useNavigate";
  return DataRouterHook2;
}(DataRouterHook$1 || {});
var DataRouterStateHook$1 = /* @__PURE__ */ function(DataRouterStateHook2) {
  DataRouterStateHook2["UseBlocker"] = "useBlocker";
  DataRouterStateHook2["UseLoaderData"] = "useLoaderData";
  DataRouterStateHook2["UseActionData"] = "useActionData";
  DataRouterStateHook2["UseRouteError"] = "useRouteError";
  DataRouterStateHook2["UseNavigation"] = "useNavigation";
  DataRouterStateHook2["UseRouteLoaderData"] = "useRouteLoaderData";
  DataRouterStateHook2["UseMatches"] = "useMatches";
  DataRouterStateHook2["UseRevalidator"] = "useRevalidator";
  DataRouterStateHook2["UseNavigateStable"] = "useNavigate";
  DataRouterStateHook2["UseRouteId"] = "useRouteId";
  return DataRouterStateHook2;
}(DataRouterStateHook$1 || {});
function useDataRouterContext$1(hookName) {
  let ctx = reactExports.useContext(DataRouterContext);
  !ctx ? invariant(false) : void 0;
  return ctx;
}
function useDataRouterState(hookName) {
  let state = reactExports.useContext(DataRouterStateContext);
  !state ? invariant(false) : void 0;
  return state;
}
function useRouteContext(hookName) {
  let route = reactExports.useContext(RouteContext);
  !route ? invariant(false) : void 0;
  return route;
}
function useCurrentRouteId(hookName) {
  let route = useRouteContext();
  let thisRoute = route.matches[route.matches.length - 1];
  !thisRoute.route.id ? invariant(false) : void 0;
  return thisRoute.route.id;
}
function useRouteError() {
  var _state$errors;
  let error = reactExports.useContext(RouteErrorContext);
  let state = useDataRouterState();
  let routeId = useCurrentRouteId();
  if (error !== void 0) {
    return error;
  }
  return (_state$errors = state.errors) == null ? void 0 : _state$errors[routeId];
}
function useNavigateStable() {
  let {
    router
  } = useDataRouterContext$1(DataRouterHook$1.UseNavigateStable);
  let id2 = useCurrentRouteId(DataRouterStateHook$1.UseNavigateStable);
  let activeRef = reactExports.useRef(false);
  useIsomorphicLayoutEffect(() => {
    activeRef.current = true;
  });
  let navigate = reactExports.useCallback(function(to, options) {
    if (options === void 0) {
      options = {};
    }
    if (!activeRef.current) return;
    if (typeof to === "number") {
      router.navigate(to);
    } else {
      router.navigate(to, _extends$1({
        fromRouteId: id2
      }, options));
    }
  }, [router, id2]);
  return navigate;
}
const alreadyWarned$1 = {};
function warningOnce(key, cond, message) {
  if (!alreadyWarned$1[key]) {
    alreadyWarned$1[key] = true;
  }
}
function logV6DeprecationWarnings(renderFuture, routerFuture) {
  if ((renderFuture == null ? void 0 : renderFuture.v7_startTransition) === void 0) ;
  if ((renderFuture == null ? void 0 : renderFuture.v7_relativeSplatPath) === void 0 && true) ;
}
function Navigate(_ref4) {
  let {
    to,
    replace: replace2,
    state,
    relative
  } = _ref4;
  !useInRouterContext() ? invariant(false) : void 0;
  let {
    future,
    static: isStatic
  } = reactExports.useContext(NavigationContext);
  let {
    matches
  } = reactExports.useContext(RouteContext);
  let {
    pathname: locationPathname
  } = useLocation();
  let navigate = useNavigate();
  let path = resolveTo(to, getResolveToMatches(matches, future.v7_relativeSplatPath), locationPathname, relative === "path");
  let jsonPath = JSON.stringify(path);
  reactExports.useEffect(() => navigate(JSON.parse(jsonPath), {
    replace: replace2,
    state,
    relative
  }), [navigate, jsonPath, relative, replace2, state]);
  return null;
}
function Outlet(props) {
  return useOutlet(props.context);
}
function Route(_props) {
  invariant(false);
}
function Router(_ref5) {
  let {
    basename: basenameProp = "/",
    children = null,
    location: locationProp,
    navigationType = Action.Pop,
    navigator: navigator2,
    static: staticProp = false,
    future
  } = _ref5;
  !!useInRouterContext() ? invariant(false) : void 0;
  let basename = basenameProp.replace(/^\/*/, "/");
  let navigationContext = reactExports.useMemo(() => ({
    basename,
    navigator: navigator2,
    static: staticProp,
    future: _extends$1({
      v7_relativeSplatPath: false
    }, future)
  }), [basename, future, navigator2, staticProp]);
  if (typeof locationProp === "string") {
    locationProp = parsePath(locationProp);
  }
  let {
    pathname = "/",
    search = "",
    hash = "",
    state = null,
    key = "default"
  } = locationProp;
  let locationContext = reactExports.useMemo(() => {
    let trailingPathname = stripBasename(pathname, basename);
    if (trailingPathname == null) {
      return null;
    }
    return {
      location: {
        pathname: trailingPathname,
        search,
        hash,
        state,
        key
      },
      navigationType
    };
  }, [basename, pathname, search, hash, state, key, navigationType]);
  if (locationContext == null) {
    return null;
  }
  return /* @__PURE__ */ reactExports.createElement(NavigationContext.Provider, {
    value: navigationContext
  }, /* @__PURE__ */ reactExports.createElement(LocationContext.Provider, {
    children,
    value: locationContext
  }));
}
function Routes(_ref6) {
  let {
    children,
    location
  } = _ref6;
  return useRoutes(createRoutesFromChildren(children), location);
}
new Promise(() => {
});
function createRoutesFromChildren(children, parentPath) {
  if (parentPath === void 0) {
    parentPath = [];
  }
  let routes = [];
  reactExports.Children.forEach(children, (element, index2) => {
    if (!/* @__PURE__ */ reactExports.isValidElement(element)) {
      return;
    }
    let treePath = [...parentPath, index2];
    if (element.type === reactExports.Fragment) {
      routes.push.apply(routes, createRoutesFromChildren(element.props.children, treePath));
      return;
    }
    !(element.type === Route) ? invariant(false) : void 0;
    !(!element.props.index || !element.props.children) ? invariant(false) : void 0;
    let route = {
      id: element.props.id || treePath.join("-"),
      caseSensitive: element.props.caseSensitive,
      element: element.props.element,
      Component: element.props.Component,
      index: element.props.index,
      path: element.props.path,
      loader: element.props.loader,
      action: element.props.action,
      errorElement: element.props.errorElement,
      ErrorBoundary: element.props.ErrorBoundary,
      hasErrorBoundary: element.props.ErrorBoundary != null || element.props.errorElement != null,
      shouldRevalidate: element.props.shouldRevalidate,
      handle: element.props.handle,
      lazy: element.props.lazy
    };
    if (element.props.children) {
      route.children = createRoutesFromChildren(element.props.children, treePath);
    }
    routes.push(route);
  });
  return routes;
}
/**
 * React Router DOM v6.30.6
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function(n2) {
    for (var e2 = 1; e2 < arguments.length; e2++) {
      var t2 = arguments[e2];
      for (var r2 in t2) ({}).hasOwnProperty.call(t2, r2) && (n2[r2] = t2[r2]);
    }
    return n2;
  }, _extends.apply(null, arguments);
}
function _objectWithoutPropertiesLoose(r2, e2) {
  if (null == r2) return {};
  var t2 = {};
  for (var n2 in r2) if ({}.hasOwnProperty.call(r2, n2)) {
    if (-1 !== e2.indexOf(n2)) continue;
    t2[n2] = r2[n2];
  }
  return t2;
}
function isModifiedEvent(event) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}
function shouldProcessLinkClick(event, target) {
  return event.button === 0 && // Ignore everything but left clicks
  (!target || target === "_self") && // Let browser handle "target=_blank" etc.
  !isModifiedEvent(event);
}
function createSearchParams(init) {
  if (init === void 0) {
    init = "";
  }
  return new URLSearchParams(typeof init === "string" || Array.isArray(init) || init instanceof URLSearchParams ? init : Object.keys(init).reduce((memo, key) => {
    let value = init[key];
    return memo.concat(Array.isArray(value) ? value.map((v2) => [key, v2]) : [[key, value]]);
  }, []));
}
function getSearchParamsForLocation(locationSearch, defaultSearchParams) {
  let searchParams = createSearchParams(locationSearch);
  if (defaultSearchParams) {
    defaultSearchParams.forEach((_, key) => {
      if (!searchParams.has(key)) {
        defaultSearchParams.getAll(key).forEach((value) => {
          searchParams.append(key, value);
        });
      }
    });
  }
  return searchParams;
}
const _excluded = ["onClick", "relative", "reloadDocument", "replace", "state", "target", "to", "preventScrollReset", "viewTransition"], _excluded2 = ["aria-current", "caseSensitive", "className", "end", "style", "to", "viewTransition", "children"];
const REACT_ROUTER_VERSION = "6";
try {
  window.__reactRouterVersion = REACT_ROUTER_VERSION;
} catch (e2) {
}
const ViewTransitionContext = /* @__PURE__ */ reactExports.createContext({
  isTransitioning: false
});
const START_TRANSITION = "startTransition";
const startTransitionImpl = React[START_TRANSITION];
function BrowserRouter(_ref4) {
  let {
    basename,
    children,
    future,
    window: window2
  } = _ref4;
  let historyRef = reactExports.useRef();
  if (historyRef.current == null) {
    historyRef.current = createBrowserHistory({
      window: window2,
      v5Compat: true
    });
  }
  let history = historyRef.current;
  let [state, setStateImpl] = reactExports.useState({
    action: history.action,
    location: history.location
  });
  let {
    v7_startTransition
  } = future || {};
  let setState = reactExports.useCallback((newState) => {
    v7_startTransition && startTransitionImpl ? startTransitionImpl(() => setStateImpl(newState)) : setStateImpl(newState);
  }, [setStateImpl, v7_startTransition]);
  reactExports.useLayoutEffect(() => history.listen(setState), [history, setState]);
  reactExports.useEffect(() => logV6DeprecationWarnings(future), [future]);
  return /* @__PURE__ */ reactExports.createElement(Router, {
    basename,
    children,
    location: state.location,
    navigationType: state.action,
    navigator: history,
    future
  });
}
const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined" && typeof window.document.createElement !== "undefined";
const ABSOLUTE_URL_REGEX = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const Link = /* @__PURE__ */ reactExports.forwardRef(function LinkWithRef(_ref7, ref) {
  let {
    onClick,
    relative,
    reloadDocument,
    replace: replace2,
    state,
    target,
    to,
    preventScrollReset,
    viewTransition
  } = _ref7, rest = _objectWithoutPropertiesLoose(_ref7, _excluded);
  let {
    basename
  } = reactExports.useContext(NavigationContext);
  let absoluteHref;
  let isExternal = false;
  if (typeof to === "string" && ABSOLUTE_URL_REGEX.test(to)) {
    absoluteHref = to;
    if (isBrowser) {
      try {
        let currentUrl = new URL(window.location.href);
        let targetUrl = to.startsWith("//") ? new URL(currentUrl.protocol + to) : new URL(to);
        let path = stripBasename(targetUrl.pathname, basename);
        if (targetUrl.origin === currentUrl.origin && path != null) {
          to = path + targetUrl.search + targetUrl.hash;
        } else {
          isExternal = true;
        }
      } catch (e2) {
      }
    }
  }
  let href = useHref(to, {
    relative
  });
  let internalOnClick = useLinkClickHandler(to, {
    replace: replace2,
    state,
    target,
    preventScrollReset,
    relative,
    viewTransition
  });
  function handleClick(event) {
    if (onClick) onClick(event);
    if (!event.defaultPrevented) {
      internalOnClick(event);
    }
  }
  return (
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    /* @__PURE__ */ reactExports.createElement("a", _extends({}, rest, {
      href: absoluteHref || href,
      onClick: isExternal || reloadDocument ? onClick : handleClick,
      ref,
      target
    }))
  );
});
const NavLink = /* @__PURE__ */ reactExports.forwardRef(function NavLinkWithRef(_ref8, ref) {
  let {
    "aria-current": ariaCurrentProp = "page",
    caseSensitive = false,
    className: classNameProp = "",
    end = false,
    style: styleProp,
    to,
    viewTransition,
    children
  } = _ref8, rest = _objectWithoutPropertiesLoose(_ref8, _excluded2);
  let path = useResolvedPath(to, {
    relative: rest.relative
  });
  let location = useLocation();
  let routerState = reactExports.useContext(DataRouterStateContext);
  let {
    navigator: navigator2,
    basename
  } = reactExports.useContext(NavigationContext);
  let isTransitioning = routerState != null && // Conditional usage is OK here because the usage of a data router is static
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useViewTransitionState(path) && viewTransition === true;
  let toPathname = navigator2.encodeLocation ? navigator2.encodeLocation(path).pathname : path.pathname;
  let locationPathname = location.pathname;
  let nextLocationPathname = routerState && routerState.navigation && routerState.navigation.location ? routerState.navigation.location.pathname : null;
  if (!caseSensitive) {
    locationPathname = locationPathname.toLowerCase();
    nextLocationPathname = nextLocationPathname ? nextLocationPathname.toLowerCase() : null;
    toPathname = toPathname.toLowerCase();
  }
  if (nextLocationPathname && basename) {
    nextLocationPathname = stripBasename(nextLocationPathname, basename) || nextLocationPathname;
  }
  const endSlashPosition = toPathname !== "/" && toPathname.endsWith("/") ? toPathname.length - 1 : toPathname.length;
  let isActive = locationPathname === toPathname || !end && locationPathname.startsWith(toPathname) && locationPathname.charAt(endSlashPosition) === "/";
  let isPending = nextLocationPathname != null && (nextLocationPathname === toPathname || !end && nextLocationPathname.startsWith(toPathname) && nextLocationPathname.charAt(toPathname.length) === "/");
  let renderProps = {
    isActive,
    isPending,
    isTransitioning
  };
  let ariaCurrent = isActive ? ariaCurrentProp : void 0;
  let className;
  if (typeof classNameProp === "function") {
    className = classNameProp(renderProps);
  } else {
    className = [classNameProp, isActive ? "active" : null, isPending ? "pending" : null, isTransitioning ? "transitioning" : null].filter(Boolean).join(" ");
  }
  let style = typeof styleProp === "function" ? styleProp(renderProps) : styleProp;
  return /* @__PURE__ */ reactExports.createElement(Link, _extends({}, rest, {
    "aria-current": ariaCurrent,
    className,
    ref,
    style,
    to,
    viewTransition
  }), typeof children === "function" ? children(renderProps) : children);
});
var DataRouterHook;
(function(DataRouterHook2) {
  DataRouterHook2["UseScrollRestoration"] = "useScrollRestoration";
  DataRouterHook2["UseSubmit"] = "useSubmit";
  DataRouterHook2["UseSubmitFetcher"] = "useSubmitFetcher";
  DataRouterHook2["UseFetcher"] = "useFetcher";
  DataRouterHook2["useViewTransitionState"] = "useViewTransitionState";
})(DataRouterHook || (DataRouterHook = {}));
var DataRouterStateHook;
(function(DataRouterStateHook2) {
  DataRouterStateHook2["UseFetcher"] = "useFetcher";
  DataRouterStateHook2["UseFetchers"] = "useFetchers";
  DataRouterStateHook2["UseScrollRestoration"] = "useScrollRestoration";
})(DataRouterStateHook || (DataRouterStateHook = {}));
function useDataRouterContext(hookName) {
  let ctx = reactExports.useContext(DataRouterContext);
  !ctx ? invariant(false) : void 0;
  return ctx;
}
function useLinkClickHandler(to, _temp) {
  let {
    target,
    replace: replaceProp,
    state,
    preventScrollReset,
    relative,
    viewTransition
  } = _temp === void 0 ? {} : _temp;
  let navigate = useNavigate();
  let location = useLocation();
  let path = useResolvedPath(to, {
    relative
  });
  return reactExports.useCallback((event) => {
    if (shouldProcessLinkClick(event, target)) {
      event.preventDefault();
      let replace2 = replaceProp !== void 0 ? replaceProp : createPath(location) === createPath(path);
      navigate(to, {
        replace: replace2,
        state,
        preventScrollReset,
        relative,
        viewTransition
      });
    }
  }, [location, navigate, path, replaceProp, state, target, to, preventScrollReset, relative, viewTransition]);
}
function useSearchParams(defaultInit) {
  let defaultSearchParamsRef = reactExports.useRef(createSearchParams(defaultInit));
  let hasSetSearchParamsRef = reactExports.useRef(false);
  let location = useLocation();
  let searchParams = reactExports.useMemo(() => (
    // Only merge in the defaults if we haven't yet called setSearchParams.
    // Once we call that we want those to take precedence, otherwise you can't
    // remove a param with setSearchParams({}) if it has an initial value
    getSearchParamsForLocation(location.search, hasSetSearchParamsRef.current ? null : defaultSearchParamsRef.current)
  ), [location.search]);
  let navigate = useNavigate();
  let setSearchParams = reactExports.useCallback((nextInit, navigateOptions) => {
    const newSearchParams = createSearchParams(typeof nextInit === "function" ? nextInit(searchParams) : nextInit);
    hasSetSearchParamsRef.current = true;
    navigate("?" + newSearchParams, navigateOptions);
  }, [navigate, searchParams]);
  return [searchParams, setSearchParams];
}
function useViewTransitionState(to, opts) {
  if (opts === void 0) {
    opts = {};
  }
  let vtContext = reactExports.useContext(ViewTransitionContext);
  !(vtContext != null) ? invariant(false) : void 0;
  let {
    basename
  } = useDataRouterContext(DataRouterHook.useViewTransitionState);
  let path = useResolvedPath(to, {
    relative: opts.relative
  });
  if (!vtContext.isTransitioning) {
    return false;
  }
  let currentPath = stripBasename(vtContext.currentLocation.pathname, basename) || vtContext.currentLocation.pathname;
  let nextPath = stripBasename(vtContext.nextLocation.pathname, basename) || vtContext.nextLocation.pathname;
  return matchPath(path.pathname, nextPath) != null || matchPath(path.pathname, currentPath) != null;
}
const a$b = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M244,56v48a12,12,0,0,1-12,12H184a12,12,0,1,1,0-24H201.1l-19-17.38c-.13-.12-.26-.24-.38-.37A76,76,0,1,0,127,204h1a75.53,75.53,0,0,0,52.15-20.72,12,12,0,0,1,16.49,17.45A99.45,99.45,0,0,1,128,228h-1.37A100,100,0,1,1,198.51,57.06L220,76.72V56a12,12,0,0,1,24,0Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M216,128a88,88,0,1,1-88-88A88,88,0,0,1,216,128Z", opacity: "0.2" }), /* @__PURE__ */ reactExports.createElement("path", { d: "M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64l-.25-.24a80,80,0,1,0-1.67,114.78,8,8,0,0,1,11,11.63A95.44,95.44,0,0,1,128,224h-1.32A96,96,0,1,1,195.75,60L224,85.8V56a8,8,0,1,1,16,0Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1-5.66-13.66l17-17-10.55-9.65-.25-.24a80,80,0,1,0-1.67,114.78,8,8,0,1,1,11,11.63A95.44,95.44,0,0,1,128,224h-1.32A96,96,0,1,1,195.75,60l10.93,10L226.34,50.3A8,8,0,0,1,240,56Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M238,56v48a6,6,0,0,1-6,6H184a6,6,0,0,1,0-12h32.55l-30.38-27.8c-.06-.06-.12-.13-.19-.19a82,82,0,1,0-1.7,117.65,6,6,0,0,1,8.24,8.73A93.46,93.46,0,0,1,128,222h-1.28A94,94,0,1,1,194.37,61.4L226,90.35V56a6,6,0,1,1,12,0Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64l-.25-.24a80,80,0,1,0-1.67,114.78,8,8,0,0,1,11,11.63A95.44,95.44,0,0,1,128,224h-1.32A96,96,0,1,1,195.75,60L224,85.8V56a8,8,0,1,1,16,0Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M236,56v48a4,4,0,0,1-4,4H184a4,4,0,0,1,0-8h37.7L187.53,68.69l-.13-.12a84,84,0,1,0-1.75,120.51,4,4,0,0,1,5.5,5.82A91.43,91.43,0,0,1,128,220h-1.26A92,92,0,1,1,193,62.84l35,32.05V56a4,4,0,1,1,8,0Z" }))
  ]
]);
const a$a = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M224.49,136.49l-72,72a12,12,0,0,1-17-17L187,140H40a12,12,0,0,1,0-24H187L135.51,64.48a12,12,0,0,1,17-17l72,72A12,12,0,0,1,224.49,136.49Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M216,128l-72,72V56Z", opacity: "0.2" }), /* @__PURE__ */ reactExports.createElement("path", { d: "M221.66,122.34l-72-72A8,8,0,0,0,136,56v64H40a8,8,0,0,0,0,16h96v64a8,8,0,0,0,13.66,5.66l72-72A8,8,0,0,0,221.66,122.34ZM152,180.69V75.31L204.69,128Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M221.66,133.66l-72,72A8,8,0,0,1,136,200V136H40a8,8,0,0,1,0-16h96V56a8,8,0,0,1,13.66-5.66l72,72A8,8,0,0,1,221.66,133.66Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M220.24,132.24l-72,72a6,6,0,0,1-8.48-8.48L201.51,134H40a6,6,0,0,1,0-12H201.51L139.76,60.24a6,6,0,0,1,8.48-8.48l72,72A6,6,0,0,1,220.24,132.24Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M218.83,130.83l-72,72a4,4,0,0,1-5.66-5.66L206.34,132H40a4,4,0,0,1,0-8H206.34L141.17,58.83a4,4,0,0,1,5.66-5.66l72,72A4,4,0,0,1,218.83,130.83Z" }))
  ]
]);
const e$a = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M240,204H228V96a20,20,0,0,0-20-20H172V32a20,20,0,0,0-28.45-18.12l-104,48.54A20.06,20.06,0,0,0,28,80.55V204H16a12,12,0,0,0,0,24H240a12,12,0,0,0,0-24ZM204,100V204H172V100ZM52,83.09,148,38.3V204H52ZM132,112v12a12,12,0,0,1-24,0V112a12,12,0,0,1,24,0Zm-40,0v12a12,12,0,0,1-24,0V112a12,12,0,0,1,24,0Zm0,52v12a12,12,0,0,1-24,0V164a12,12,0,0,1,24,0Zm40,0v12a12,12,0,0,1-24,0V164a12,12,0,0,1,24,0Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(
      "path",
      {
        d: "M136,32V216H40V85.35a8,8,0,0,1,3.56-6.66l80-53.33A8,8,0,0,1,136,32Z",
        opacity: "0.2"
      }
    ), /* @__PURE__ */ reactExports.createElement("path", { d: "M240,208H224V96a16,16,0,0,0-16-16H144V32a16,16,0,0,0-24.88-13.32L39.12,72A16,16,0,0,0,32,85.34V208H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM208,96V208H144V96ZM48,85.34,128,32V208H48ZM112,112v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm-32,0v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm0,56v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Zm32,0v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M239.73,208H224V96a16,16,0,0,0-16-16H164a4,4,0,0,0-4,4V208H144V32.41a16.43,16.43,0,0,0-6.16-13,16,16,0,0,0-18.72-.69L39.12,72A16,16,0,0,0,32,85.34V208H16.27A8.18,8.18,0,0,0,8,215.47,8,8,0,0,0,16,224H240a8,8,0,0,0,8-8.53A8.18,8.18,0,0,0,239.73,208ZM76,184a8,8,0,0,1-8.53,8A8.18,8.18,0,0,1,60,183.72V168.27A8.19,8.19,0,0,1,67.47,160,8,8,0,0,1,76,168Zm0-56a8,8,0,0,1-8.53,8A8.19,8.19,0,0,1,60,127.72V112.27A8.19,8.19,0,0,1,67.47,104,8,8,0,0,1,76,112Zm40,56a8,8,0,0,1-8.53,8,8.18,8.18,0,0,1-7.47-8.26V168.27a8.19,8.19,0,0,1,7.47-8.26,8,8,0,0,1,8.53,8Zm0-56a8,8,0,0,1-8.53,8,8.19,8.19,0,0,1-7.47-8.26V112.27a8.19,8.19,0,0,1,7.47-8.26,8,8,0,0,1,8.53,8Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M240,210H222V96a14,14,0,0,0-14-14H142V32a14,14,0,0,0-21.77-11.64l-80,53.33A14,14,0,0,0,34,85.34V210H16a6,6,0,0,0,0,12H240a6,6,0,0,0,0-12ZM208,94a2,2,0,0,1,2,2V210H142V94ZM46,85.34a2,2,0,0,1,.89-1.66l80-53.34A2,2,0,0,1,130,32V210H46ZM110,112v16a6,6,0,0,1-12,0V112a6,6,0,0,1,12,0Zm-32,0v16a6,6,0,0,1-12,0V112a6,6,0,0,1,12,0Zm0,56v16a6,6,0,0,1-12,0V168a6,6,0,0,1,12,0Zm32,0v16a6,6,0,0,1-12,0V168a6,6,0,0,1,12,0Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M240,208H224V96a16,16,0,0,0-16-16H144V32a16,16,0,0,0-24.88-13.32L39.12,72A16,16,0,0,0,32,85.34V208H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM208,96V208H144V96ZM48,85.34,128,32V208H48ZM112,112v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm-32,0v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm0,56v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Zm32,0v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M240,212H220V96a12,12,0,0,0-12-12H140V32a12,12,0,0,0-18.66-10l-80,53.33a12,12,0,0,0-5.34,10V212H16a4,4,0,0,0,0,8H240a4,4,0,0,0,0-8ZM208,92a4,4,0,0,1,4,4V212H140V92ZM44,85.34A4,4,0,0,1,45.78,82l80-53.33A4,4,0,0,1,132,32V212H44ZM108,112v16a4,4,0,0,1-8,0V112a4,4,0,0,1,8,0Zm-32,0v16a4,4,0,0,1-8,0V112a4,4,0,0,1,8,0Zm0,56v16a4,4,0,0,1-8,0V168a4,4,0,0,1,8,0Zm32,0v16a4,4,0,0,1-8,0V168a4,4,0,0,1,8,0Z" }))
  ]
]);
const e$9 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M208.49,199.51a12,12,0,0,1-17,17l-80-80a12,12,0,0,1,0-17l80-80a12,12,0,0,1,17,17L137,128ZM57,128l71.52-71.51a12,12,0,0,0-17-17l-80,80a12,12,0,0,0,0,17l80,80a12,12,0,0,0,17-17Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M200,48V208l-80-80Z", opacity: "0.2" }), /* @__PURE__ */ reactExports.createElement("path", { d: "M203.06,40.61a8,8,0,0,0-8.72,1.73l-80,80a8,8,0,0,0,0,11.32l80,80A8,8,0,0,0,208,208V48A8,8,0,0,0,203.06,40.61ZM192,188.69,131.31,128,192,67.31Zm-66.34,13.65a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L51.31,128Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M208,48V208a8,8,0,0,1-13.66,5.66L128,147.31V208a8,8,0,0,1-13.66,5.66l-80-80a8,8,0,0,1,0-11.32l80-80A8,8,0,0,1,128,48v60.69l66.34-66.35A8,8,0,0,1,208,48Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M204.24,203.76a6,6,0,1,1-8.48,8.48l-80-80a6,6,0,0,1,0-8.48l80-80a6,6,0,0,1,8.48,8.48L128.49,128ZM48.49,128l75.75-75.76a6,6,0,0,0-8.48-8.48l-80,80a6,6,0,0,0,0,8.48l80,80a6,6,0,1,0,8.48-8.48Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M205.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L131.31,128ZM51.31,128l74.35-74.34a8,8,0,0,0-11.32-11.32l-80,80a8,8,0,0,0,0,11.32l80,80a8,8,0,0,0,11.32-11.32Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M202.83,205.17a4,4,0,0,1-5.66,5.66l-80-80a4,4,0,0,1,0-5.66l80-80a4,4,0,1,1,5.66,5.66L125.66,128ZM45.66,128l77.17-77.17a4,4,0,0,0-5.66-5.66l-80,80a4,4,0,0,0,0,5.66l80,80a4,4,0,1,0,5.66-5.66Z" }))
  ]
]);
const a$9 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M144.49,136.49l-80,80a12,12,0,0,1-17-17L119,128,47.51,56.49a12,12,0,0,1,17-17l80,80A12,12,0,0,1,144.49,136.49Zm80-17-80-80a12,12,0,1,0-17,17L199,128l-71.52,71.51a12,12,0,0,0,17,17l80-80A12,12,0,0,0,224.49,119.51Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M136,128,56,208V48Z", opacity: "0.2" }), /* @__PURE__ */ reactExports.createElement("path", { d: "M141.66,122.34l-80-80A8,8,0,0,0,48,48V208a8,8,0,0,0,13.66,5.66l80-80A8,8,0,0,0,141.66,122.34ZM64,188.69V67.31L124.69,128Zm157.66-55-80,80a8,8,0,0,1-11.32-11.32L204.69,128,130.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,221.66,133.66Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M221.66,133.66l-80,80A8,8,0,0,1,128,208V147.31L61.66,213.66A8,8,0,0,1,48,208V48a8,8,0,0,1,13.66-5.66L128,108.69V48a8,8,0,0,1,13.66-5.66l80,80A8,8,0,0,1,221.66,133.66Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M140.24,132.24l-80,80a6,6,0,0,1-8.48-8.48L127.51,128,51.76,52.24a6,6,0,0,1,8.48-8.48l80,80A6,6,0,0,1,140.24,132.24Zm80-8.48-80-80a6,6,0,0,0-8.48,8.48L207.51,128l-75.75,75.76a6,6,0,1,0,8.48,8.48l80-80A6,6,0,0,0,220.24,123.76Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M141.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L124.69,128,50.34,53.66A8,8,0,0,1,61.66,42.34l80,80A8,8,0,0,1,141.66,133.66Zm80-11.32-80-80a8,8,0,0,0-11.32,11.32L204.69,128l-74.35,74.34a8,8,0,0,0,11.32,11.32l80-80A8,8,0,0,0,221.66,122.34Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M138.83,130.83l-80,80a4,4,0,0,1-5.66-5.66L130.34,128,53.17,50.83a4,4,0,0,1,5.66-5.66l80,80A4,4,0,0,1,138.83,130.83Zm80-5.66-80-80a4,4,0,0,0-5.66,5.66L210.34,128l-77.17,77.17a4,4,0,0,0,5.66,5.66l80-80A4,4,0,0,0,218.83,125.17Z" }))
  ]
]);
const t$4 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M216.49,104.49l-80,80a12,12,0,0,1-17,0l-80-80a12,12,0,0,1,17-17L128,159l71.51-71.52a12,12,0,0,1,17,17Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M208,96l-80,80L48,96Z", opacity: "0.2" }), /* @__PURE__ */ reactExports.createElement("path", { d: "M215.39,92.94A8,8,0,0,0,208,88H48a8,8,0,0,0-5.66,13.66l80,80a8,8,0,0,0,11.32,0l80-80A8,8,0,0,0,215.39,92.94ZM128,164.69,67.31,104H188.69Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,48,88H208a8,8,0,0,1,5.66,13.66Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M212.24,100.24l-80,80a6,6,0,0,1-8.48,0l-80-80a6,6,0,0,1,8.48-8.48L128,167.51l75.76-75.75a6,6,0,0,1,8.48,8.48Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M210.83,98.83l-80,80a4,4,0,0,1-5.66,0l-80-80a4,4,0,0,1,5.66-5.66L128,170.34l77.17-77.17a4,4,0,1,1,5.66,5.66Z" }))
  ]
]);
const t$3 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M184.49,136.49l-80,80a12,12,0,0,1-17-17L159,128,87.51,56.49a12,12,0,1,1,17-17l80,80A12,12,0,0,1,184.49,136.49Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M176,128,96,208V48Z", opacity: "0.2" }), /* @__PURE__ */ reactExports.createElement("path", { d: "M181.66,122.34l-80-80A8,8,0,0,0,88,48V208a8,8,0,0,0,13.66,5.66l80-80A8,8,0,0,0,181.66,122.34ZM104,188.69V67.31L164.69,128Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M181.66,133.66l-80,80A8,8,0,0,1,88,208V48a8,8,0,0,1,13.66-5.66l80,80A8,8,0,0,1,181.66,133.66Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M180.24,132.24l-80,80a6,6,0,0,1-8.48-8.48L167.51,128,91.76,52.24a6,6,0,0,1,8.48-8.48l80,80A6,6,0,0,1,180.24,132.24Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M178.83,130.83l-80,80a4,4,0,0,1-5.66-5.66L170.34,128,93.17,50.83a4,4,0,0,1,5.66-5.66l80,80A4,4,0,0,1,178.83,130.83Z" }))
  ]
]);
const a$8 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M176.49,95.51a12,12,0,0,1,0,17l-56,56a12,12,0,0,1-17,0l-24-24a12,12,0,1,1,17-17L112,143l47.51-47.52A12,12,0,0,1,176.49,95.51ZM236,128A108,108,0,1,1,128,20,108.12,108.12,0,0,1,236,128Zm-24,0a84,84,0,1,0-84,84A84.09,84.09,0,0,0,212,128Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z", opacity: "0.2" }), /* @__PURE__ */ reactExports.createElement("path", { d: "M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M172.24,99.76a6,6,0,0,1,0,8.48l-56,56a6,6,0,0,1-8.48,0l-24-24a6,6,0,0,1,8.48-8.48L112,151.51l51.76-51.75A6,6,0,0,1,172.24,99.76ZM230,128A102,102,0,1,1,128,26,102.12,102.12,0,0,1,230,128Zm-12,0a90,90,0,1,0-90,90A90.1,90.1,0,0,0,218,128Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M170.83,101.17a4,4,0,0,1,0,5.66l-56,56a4,4,0,0,1-5.66,0l-24-24a4,4,0,0,1,5.66-5.66L112,154.34l53.17-53.17A4,4,0,0,1,170.83,101.17ZM228,128A100,100,0,1,1,128,28,100.11,100.11,0,0,1,228,128Zm-8,0a92,92,0,1,0-92,92A92.1,92.1,0,0,0,220,128Z" }))
  ]
]);
const a$7 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Zm68-84a12,12,0,0,1-12,12H128a12,12,0,0,1-12-12V72a12,12,0,0,1,24,0v44h44A12,12,0,0,1,196,128Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z", opacity: "0.2" }), /* @__PURE__ */ reactExports.createElement("path", { d: "M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm56,112H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48a8,8,0,0,1,0,16Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M128,26A102,102,0,1,0,230,128,102.12,102.12,0,0,0,128,26Zm0,192a90,90,0,1,1,90-90A90.1,90.1,0,0,1,128,218Zm62-90a6,6,0,0,1-6,6H128a6,6,0,0,1-6-6V72a6,6,0,0,1,12,0v50h50A6,6,0,0,1,190,128Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M128,28A100,100,0,1,0,228,128,100.11,100.11,0,0,0,128,28Zm0,192a92,92,0,1,1,92-92A92.1,92.1,0,0,1,128,220Zm60-92a4,4,0,0,1-4,4H128a4,4,0,0,1-4-4V72a4,4,0,0,1,8,0v52h52A4,4,0,0,1,188,128Z" }))
  ]
]);
const l$2 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M225.6,62.64l-88-48.17a19.91,19.91,0,0,0-19.2,0l-88,48.17A20,20,0,0,0,20,80.19v95.62a20,20,0,0,0,10.4,17.55l88,48.17a19.89,19.89,0,0,0,19.2,0l88-48.17A20,20,0,0,0,236,175.81V80.19A20,20,0,0,0,225.6,62.64ZM128,36.57,200,76,128,115.4,56,76ZM44,96.79l72,39.4v76.67L44,173.44Zm96,116.07V136.19l72-39.4v76.65Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(
      "path",
      {
        d: "M128,129.09V232a8,8,0,0,1-3.84-1l-88-48.16a8,8,0,0,1-4.16-7V80.2a8,8,0,0,1,.7-3.27Z",
        opacity: "0.2"
      }
    ), /* @__PURE__ */ reactExports.createElement("path", { d: "M223.68,66.15,135.68,18h0a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32h0l80.34,44L128,120,47.66,76ZM40,90l80,43.78v85.79L40,175.82Zm96,129.57V133.82L216,90v85.78Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,120,47.65,76,128,32l80.35,44Zm8,99.64V133.83l80-43.78v85.76Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M222.72,67.9l-88-48.17a13.9,13.9,0,0,0-13.44,0l-88,48.18A14,14,0,0,0,26,80.18v95.64a14,14,0,0,0,7.28,12.27l88,48.18a13.92,13.92,0,0,0,13.44,0l88-48.18A14,14,0,0,0,230,175.82V80.18A14,14,0,0,0,222.72,67.9ZM127,30.25a2,2,0,0,1,1.92,0L212.51,76,128,122.24,43.49,76ZM39,177.57a2,2,0,0,1-1-1.75V86.66l84,46V223Zm177.92,0L134,223V132.64l84-46v89.16A2,2,0,0,1,217,177.57Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M223.68,66.15,135.68,18h0a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32h0l80.34,44L128,120,47.66,76ZM40,90l80,43.78v85.79L40,175.82Zm96,129.57V133.82L216,90v85.78Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M221.76,69.66l-88-48.18a12,12,0,0,0-11.52,0l-88,48.18A12,12,0,0,0,28,80.18v95.64a12,12,0,0,0,6.24,10.52l88,48.18a11.95,11.95,0,0,0,11.52,0l88-48.18A12,12,0,0,0,228,175.82V80.18A12,12,0,0,0,221.76,69.66ZM126.08,28.5a3.94,3.94,0,0,1,3.84,0L216.67,76,128,124.52,39.33,76Zm-88,150.83A4,4,0,0,1,36,175.82V83.29l88,48.16v94.91Zm179.84,0-85.92,47V131.45l88-48.16v92.53A4,4,0,0,1,217.92,179.32Z" }))
  ]
]);
const a$6 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M224.5,95.53v0l-64-64A12,12,0,0,0,152,28H40A12,12,0,0,0,28,40V152a11.94,11.94,0,0,0,3,7.93c.15.18.31.36.5.56l64,64h0A12,12,0,0,0,104,228H216a12,12,0,0,0,12-12V104A12,12,0,0,0,224.5,95.53ZM164,69l23,23H164ZM92,187,69,164H92Zm0-47H52V69l40,40ZM69,52h71V92H109Zm71,64v24H116V116Zm-24,88V164h31l40,40Zm88-17-40-40V116h40Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M216,96V216H96L40,160V40H160Z", opacity: "0.2" }), /* @__PURE__ */ reactExports.createElement("path", { d: "M221.66,90.34h0l-56-56A8,8,0,0,0,160,32H40a8,8,0,0,0-8,8V160a8,8,0,0,0,2.3,5.61l56,56h0A8,8,0,0,0,96,224H216a8,8,0,0,0,8-8V96A8,8,0,0,0,221.66,90.34ZM168,59.31,196.69,88H168ZM88,196.69,59.31,168H88ZM88,152H48V59.31l40,40ZM59.31,48H152V88H99.31ZM152,104v48H104V104ZM104,208V168h52.69l40,40Zm104-11.31-40-40V104h40Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M104,152V104h48v48ZM32,53v95a4,4,0,0,0,4,4H88V99.31L38.83,50.14A4,4,0,0,0,32,53Zm188,51H168v52.69l49.17,49.17A4,4,0,0,0,224,203V108A4,4,0,0,0,220,104ZM152,36a4,4,0,0,0-4-4H53a4,4,0,0,0-2.83,6.83L99.31,88H152Zm60.49,45.17L174.83,43.51A4,4,0,0,0,168,46.34V88h41.66A4,4,0,0,0,212.49,81.17ZM156.69,168H104v52a4,4,0,0,0,4,4h95a4,4,0,0,0,2.83-6.83ZM43.51,174.83l37.66,37.66A4,4,0,0,0,88,209.66V168H46.34A4,4,0,0,0,43.51,174.83Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M220.24,91.75,164,35.56A5.93,5.93,0,0,0,160,34H40a6,6,0,0,0-6,6V160a6,6,0,0,0,1.76,4.25l56,56A6,6,0,0,0,96,222H216a6,6,0,0,0,6-6V96A6,6,0,0,0,220.24,91.75ZM166,54.48,201.52,90H166Zm-76,147L54.48,166H90ZM90,154H46V54.48l44,44ZM54.48,46H154V90H98.48ZM154,102v52H102V102ZM102,210V166h55.52l44,44Zm108-8.48-44-44V102h44Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M221.66,90.34h0l-56-56A8,8,0,0,0,160,32H40a8,8,0,0,0-8,8V160a8,8,0,0,0,2.3,5.61l56,56h0A8,8,0,0,0,96,224H216a8,8,0,0,0,8-8V96A8,8,0,0,0,221.66,90.34ZM168,59.31,196.69,88H168ZM88,196.69,59.31,168H88ZM88,152H48V59.31l40,40ZM59.31,48H152V88H99.31ZM152,104v48H104V104ZM104,208V168h52.69l40,40Zm104-11.31-40-40V104h40Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M219.92,95.22a1.8,1.8,0,0,0-.1-.33,3.38,3.38,0,0,0-.13-.42,2.58,2.58,0,0,0-.19-.37c-.06-.11-.11-.22-.17-.32a3.62,3.62,0,0,0-.5-.6h0l-56-56h0a2.32,2.32,0,0,0-.33-.27A4,4,0,0,0,160,36H40a4,4,0,0,0-4,4V160a4,4,0,0,0,.9,2.5,2.32,2.32,0,0,0,.27.33l56,56A4,4,0,0,0,96,220H216a4,4,0,0,0,4-4V96A4.13,4.13,0,0,0,219.92,95.22ZM164,49.66,206.34,92H164ZM92,206.34,49.66,164H92ZM92,156H44V49.66l48,48ZM49.66,44H156V92H97.66ZM156,100v56H100V100ZM100,212V164h58.34l48,48Zm112-5.66-48-48V100h48Z" }))
  ]
]);
const a$5 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M144,128a16,16,0,1,1-16-16A16,16,0,0,1,144,128ZM60,112a16,16,0,1,0,16,16A16,16,0,0,0,60,112Zm136,0a16,16,0,1,0,16,16A16,16,0,0,0,196,112Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(
      "path",
      {
        d: "M240,96v64a16,16,0,0,1-16,16H32a16,16,0,0,1-16-16V96A16,16,0,0,1,32,80H224A16,16,0,0,1,240,96Z",
        opacity: "0.2"
      }
    ), /* @__PURE__ */ reactExports.createElement("path", { d: "M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm56-12a12,12,0,1,0,12,12A12,12,0,0,0,196,116ZM60,116a12,12,0,1,0,12,12A12,12,0,0,0,60,116Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M224,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V96A16,16,0,0,0,224,80ZM60,140a12,12,0,1,1,12-12A12,12,0,0,1,60,140Zm68,0a12,12,0,1,1,12-12A12,12,0,0,1,128,140Zm68,0a12,12,0,1,1,12-12A12,12,0,0,1,196,140Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M138,128a10,10,0,1,1-10-10A10,10,0,0,1,138,128ZM60,118a10,10,0,1,0,10,10A10,10,0,0,0,60,118Zm136,0a10,10,0,1,0,10,10A10,10,0,0,0,196,118Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm56-12a12,12,0,1,0,12,12A12,12,0,0,0,196,116ZM60,116a12,12,0,1,0,12,12A12,12,0,0,0,60,116Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M136,128a8,8,0,1,1-8-8A8,8,0,0,1,136,128Zm-76-8a8,8,0,1,0,8,8A8,8,0,0,0,60,120Zm136,0a8,8,0,1,0,8,8A8,8,0,0,0,196,120Z" }))
  ]
]);
const a$4 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M251,123.13c-.37-.81-9.13-20.26-28.48-39.61C196.63,57.67,164,44,128,44S59.37,57.67,33.51,83.52C14.16,102.87,5.4,122.32,5,123.13a12.08,12.08,0,0,0,0,9.75c.37.82,9.13,20.26,28.49,39.61C59.37,198.34,92,212,128,212s68.63-13.66,94.48-39.51c19.36-19.35,28.12-38.79,28.49-39.61A12.08,12.08,0,0,0,251,123.13Zm-46.06,33C183.47,177.27,157.59,188,128,188s-55.47-10.73-76.91-31.88A130.36,130.36,0,0,1,29.52,128,130.45,130.45,0,0,1,51.09,99.89C72.54,78.73,98.41,68,128,68s55.46,10.73,76.91,31.89A130.36,130.36,0,0,1,226.48,128,130.45,130.45,0,0,1,204.91,156.12ZM128,84a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,84Zm0,64a20,20,0,1,1,20-20A20,20,0,0,1,128,148Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(
      "path",
      {
        d: "M128,56C48,56,16,128,16,128s32,72,112,72,112-72,112-72S208,56,128,56Zm0,112a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z",
        opacity: "0.2"
      }
    ), /* @__PURE__ */ reactExports.createElement("path", { d: "M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,168a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M245.48,125.57c-.34-.78-8.66-19.23-27.24-37.81C201,70.54,171.38,50,128,50S55,70.54,37.76,87.76c-18.58,18.58-26.9,37-27.24,37.81a6,6,0,0,0,0,4.88c.34.77,8.66,19.22,27.24,37.8C55,185.47,84.62,206,128,206s73-20.53,90.24-37.75c18.58-18.58,26.9-37,27.24-37.8A6,6,0,0,0,245.48,125.57ZM128,194c-31.38,0-58.78-11.42-81.45-33.93A134.77,134.77,0,0,1,22.69,128,134.56,134.56,0,0,1,46.55,95.94C69.22,73.42,96.62,62,128,62s58.78,11.42,81.45,33.94A134.56,134.56,0,0,1,233.31,128C226.94,140.21,195,194,128,194Zm0-112a46,46,0,1,0,46,46A46.06,46.06,0,0,0,128,82Zm0,80a34,34,0,1,1,34-34A34,34,0,0,1,128,162Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M243.66,126.38c-.34-.76-8.52-18.89-26.83-37.2C199.87,72.22,170.7,52,128,52S56.13,72.22,39.17,89.18c-18.31,18.31-26.49,36.44-26.83,37.2a4.08,4.08,0,0,0,0,3.25c.34.77,8.52,18.89,26.83,37.2,17,17,46.14,37.17,88.83,37.17s71.87-20.21,88.83-37.17c18.31-18.31,26.49-36.43,26.83-37.2A4.08,4.08,0,0,0,243.66,126.38Zm-32.7,35c-23.07,23-51,34.62-83,34.62s-59.89-11.65-83-34.62A135.71,135.71,0,0,1,20.44,128,135.69,135.69,0,0,1,45,94.62C68.11,71.65,96,60,128,60s59.89,11.65,83,34.62A135.79,135.79,0,0,1,235.56,128,135.71,135.71,0,0,1,211,161.38ZM128,84a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,84Zm0,80a36,36,0,1,1,36-36A36,36,0,0,1,128,164Z" }))
  ]
]);
const t$2 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M216,68H133.39l-26-29.29a20,20,0,0,0-15-6.71H40A20,20,0,0,0,20,52V200.62A19.41,19.41,0,0,0,39.38,220H216.89A19.13,19.13,0,0,0,236,200.89V88A20,20,0,0,0,216,68ZM44,56H90.61l10.67,12H44ZM212,196H44V92H212Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(
      "path",
      {
        d: "M128,80H32V56a8,8,0,0,1,8-8H92.69a8,8,0,0,1,5.65,2.34Z",
        opacity: "0.2"
      }
    ), /* @__PURE__ */ reactExports.createElement("path", { d: "M216,72H131.31L104,44.69A15.86,15.86,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200.62A15.4,15.4,0,0,0,39.38,216H216.89A15.13,15.13,0,0,0,232,200.89V88A16,16,0,0,0,216,72ZM92.69,56l16,16H40V56ZM216,200H40V88H216Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M216,72H131.31L104,44.69A15.88,15.88,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200.62A15.41,15.41,0,0,0,39.39,216h177.5A15.13,15.13,0,0,0,232,200.89V88A16,16,0,0,0,216,72ZM40,56H92.69l16,16H40Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M216,74H130.49l-27.9-27.9a13.94,13.94,0,0,0-9.9-4.1H40A14,14,0,0,0,26,56V200.62A13.39,13.39,0,0,0,39.38,214H216.89A13.12,13.12,0,0,0,230,200.89V88A14,14,0,0,0,216,74ZM40,54H92.69a2,2,0,0,1,1.41.59L113.51,74H38V56A2,2,0,0,1,40,54ZM218,200.89a1.11,1.11,0,0,1-1.11,1.11H39.38A1.4,1.4,0,0,1,38,200.62V86H216a2,2,0,0,1,2,2Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M216,72H131.31L104,44.69A15.86,15.86,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200.62A15.4,15.4,0,0,0,39.38,216H216.89A15.13,15.13,0,0,0,232,200.89V88A16,16,0,0,0,216,72ZM40,56H92.69l16,16H40ZM216,200H40V88H216Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M216,76H129.66L101.17,47.52A11.9,11.9,0,0,0,92.69,44H40A12,12,0,0,0,28,56V200.62A11.4,11.4,0,0,0,39.38,212H216.89A11.12,11.12,0,0,0,228,200.89V88A12,12,0,0,0,216,76ZM36,56a4,4,0,0,1,4-4H92.69a4,4,0,0,1,2.82,1.17L118.34,76H36ZM220,200.89a3.12,3.12,0,0,1-3.11,3.11H39.38A3.39,3.39,0,0,1,36,200.62V84H216a4,4,0,0,1,4,4Z" }))
  ]
]);
const l$1 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M128,76a52,52,0,1,0,52,52A52.06,52.06,0,0,0,128,76Zm0,80a28,28,0,1,1,28-28A28,28,0,0,1,128,156Zm113.86-49.57A12,12,0,0,0,236,98.34L208.21,82.49l-.11-31.31a12,12,0,0,0-4.25-9.12,116,116,0,0,0-38-21.41,12,12,0,0,0-9.68.89L128,37.27,99.83,21.53a12,12,0,0,0-9.7-.9,116.06,116.06,0,0,0-38,21.47,12,12,0,0,0-4.24,9.1l-.14,31.34L20,98.35a12,12,0,0,0-5.85,8.11,110.7,110.7,0,0,0,0,43.11A12,12,0,0,0,20,157.66l27.82,15.85.11,31.31a12,12,0,0,0,4.25,9.12,116,116,0,0,0,38,21.41,12,12,0,0,0,9.68-.89L128,218.73l28.14,15.74a12,12,0,0,0,9.7.9,116.06,116.06,0,0,0,38-21.47,12,12,0,0,0,4.24-9.1l.14-31.34,27.81-15.81a12,12,0,0,0,5.85-8.11A110.7,110.7,0,0,0,241.86,106.43Zm-22.63,33.18-26.88,15.28a11.94,11.94,0,0,0-4.55,4.59c-.54,1-1.11,1.93-1.7,2.88a12,12,0,0,0-1.83,6.31L184.13,199a91.83,91.83,0,0,1-21.07,11.87l-27.15-15.19a12,12,0,0,0-5.86-1.53h-.29c-1.14,0-2.3,0-3.44,0a12.08,12.08,0,0,0-6.14,1.51L93,210.82A92.27,92.27,0,0,1,71.88,199l-.11-30.24a12,12,0,0,0-1.83-6.32c-.58-.94-1.16-1.91-1.7-2.88A11.92,11.92,0,0,0,63.7,155L36.8,139.63a86.53,86.53,0,0,1,0-23.24l26.88-15.28a12,12,0,0,0,4.55-4.58c.54-1,1.11-1.94,1.7-2.89a12,12,0,0,0,1.83-6.31L71.87,57A91.83,91.83,0,0,1,92.94,45.17l27.15,15.19a11.92,11.92,0,0,0,6.15,1.52c1.14,0,2.3,0,3.44,0a12.08,12.08,0,0,0,6.14-1.51L163,45.18A92.27,92.27,0,0,1,184.12,57l.11,30.24a12,12,0,0,0,1.83,6.32c.58.94,1.16,1.91,1.7,2.88A11.92,11.92,0,0,0,192.3,101l26.9,15.33A86.53,86.53,0,0,1,219.23,139.61Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(
      "path",
      {
        d: "M230.1,108.76,198.25,90.62c-.64-1.16-1.31-2.29-2-3.41l-.12-36A104.61,104.61,0,0,0,162,32L130,49.89c-1.34,0-2.69,0-4,0L94,32A104.58,104.58,0,0,0,59.89,51.25l-.16,36c-.7,1.12-1.37,2.26-2,3.41l-31.84,18.1a99.15,99.15,0,0,0,0,38.46l31.85,18.14c.64,1.16,1.31,2.29,2,3.41l.12,36A104.61,104.61,0,0,0,94,224l32-17.87c1.34,0,2.69,0,4,0L162,224a104.58,104.58,0,0,0,34.08-19.25l.16-36c.7-1.12,1.37-2.26,2-3.41l31.84-18.1A99.15,99.15,0,0,0,230.1,108.76ZM128,168a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z",
        opacity: "0.2"
      }
    ), /* @__PURE__ */ reactExports.createElement("path", { d: "M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm109.94-52.79a8,8,0,0,0-3.89-5.4l-29.83-17-.12-33.62a8,8,0,0,0-2.83-6.08,111.91,111.91,0,0,0-36.72-20.67,8,8,0,0,0-6.46.59L128,41.85,97.88,25a8,8,0,0,0-6.47-.6A111.92,111.92,0,0,0,54.73,45.15a8,8,0,0,0-2.83,6.07l-.15,33.65-29.83,17a8,8,0,0,0-3.89,5.4,106.47,106.47,0,0,0,0,41.56,8,8,0,0,0,3.89,5.4l29.83,17,.12,33.63a8,8,0,0,0,2.83,6.08,111.91,111.91,0,0,0,36.72,20.67,8,8,0,0,0,6.46-.59L128,214.15,158.12,231a7.91,7.91,0,0,0,3.9,1,8.09,8.09,0,0,0,2.57-.42,112.1,112.1,0,0,0,36.68-20.73,8,8,0,0,0,2.83-6.07l.15-33.65,29.83-17a8,8,0,0,0,3.89-5.4A106.47,106.47,0,0,0,237.94,107.21Zm-15,34.91-28.57,16.25a8,8,0,0,0-3,3c-.58,1-1.19,2.06-1.81,3.06a7.94,7.94,0,0,0-1.22,4.21l-.15,32.25a95.89,95.89,0,0,1-25.37,14.3L134,199.13a8,8,0,0,0-3.91-1h-.19c-1.21,0-2.43,0-3.64,0a8.1,8.1,0,0,0-4.1,1l-28.84,16.1A96,96,0,0,1,67.88,201l-.11-32.2a8,8,0,0,0-1.22-4.22c-.62-1-1.23-2-1.8-3.06a8.09,8.09,0,0,0-3-3.06l-28.6-16.29a90.49,90.49,0,0,1,0-28.26L61.67,97.63a8,8,0,0,0,3-3c.58-1,1.19-2.06,1.81-3.06a7.94,7.94,0,0,0,1.22-4.21l.15-32.25a95.89,95.89,0,0,1,25.37-14.3L122,56.87a8,8,0,0,0,4.1,1c1.21,0,2.43,0,3.64,0a8,8,0,0,0,4.1-1l28.84-16.1A96,96,0,0,1,188.12,55l.11,32.2a8,8,0,0,0,1.22,4.22c.62,1,1.23,2,1.8,3.06a8.09,8.09,0,0,0,3,3.06l28.6,16.29A90.49,90.49,0,0,1,222.9,142.12Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M237.94,107.21a8,8,0,0,0-3.89-5.4l-29.83-17-.12-33.62a8,8,0,0,0-2.83-6.08,111.91,111.91,0,0,0-36.72-20.67,8,8,0,0,0-6.46.59L128,41.85,97.88,25a8,8,0,0,0-6.47-.6A111.92,111.92,0,0,0,54.73,45.15a8,8,0,0,0-2.83,6.07l-.15,33.65-29.83,17a8,8,0,0,0-3.89,5.4,106.47,106.47,0,0,0,0,41.56,8,8,0,0,0,3.89,5.4l29.83,17,.12,33.63a8,8,0,0,0,2.83,6.08,111.91,111.91,0,0,0,36.72,20.67,8,8,0,0,0,6.46-.59L128,214.15,158.12,231a7.91,7.91,0,0,0,3.9,1,8.09,8.09,0,0,0,2.57-.42,112.1,112.1,0,0,0,36.68-20.73,8,8,0,0,0,2.83-6.07l.15-33.65,29.83-17a8,8,0,0,0,3.89-5.4A106.47,106.47,0,0,0,237.94,107.21ZM128,168a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M128,82a46,46,0,1,0,46,46A46.06,46.06,0,0,0,128,82Zm0,80a34,34,0,1,1,34-34A34,34,0,0,1,128,162Zm108-54.4a6,6,0,0,0-2.92-4L202.64,86.22l-.42-.71L202.1,51.2A6,6,0,0,0,200,46.64a110.12,110.12,0,0,0-36.07-20.31,6,6,0,0,0-4.84.45L128.46,43.86h-1L96.91,26.76a6,6,0,0,0-4.86-.44A109.92,109.92,0,0,0,56,46.68a6,6,0,0,0-2.12,4.55l-.16,34.34c-.14.23-.28.47-.41.71L22.91,103.57A6,6,0,0,0,20,107.62a104.81,104.81,0,0,0,0,40.78,6,6,0,0,0,2.92,4l30.42,17.33.42.71.12,34.31A6,6,0,0,0,56,209.36a110.12,110.12,0,0,0,36.07,20.31,6,6,0,0,0,4.84-.45l30.61-17.08h1l30.56,17.1A6.09,6.09,0,0,0,162,230a5.83,5.83,0,0,0,1.93-.32,109.92,109.92,0,0,0,36-20.36,6,6,0,0,0,2.12-4.55l.16-34.34c.14-.23.28-.47.41-.71l30.42-17.29a6,6,0,0,0,2.92-4.05A104.81,104.81,0,0,0,236,107.6Zm-11.25,35.79L195.32,160.1a6.07,6.07,0,0,0-2.28,2.3c-.59,1-1.21,2.11-1.86,3.14a6,6,0,0,0-.91,3.16l-.16,33.21a98.15,98.15,0,0,1-27.52,15.53L133,200.88a6,6,0,0,0-2.93-.77h-.14c-1.24,0-2.5,0-3.74,0a6,6,0,0,0-3.07.76L93.45,217.43a98,98,0,0,1-27.56-15.49l-.12-33.17a6,6,0,0,0-.91-3.16c-.64-1-1.27-2.08-1.86-3.14a6,6,0,0,0-2.27-2.3L31.3,143.4a93,93,0,0,1,0-30.79L60.68,95.9A6.07,6.07,0,0,0,63,93.6c.59-1,1.21-2.11,1.86-3.14a6,6,0,0,0,.91-3.16l.16-33.21A98.15,98.15,0,0,1,93.41,38.56L123,55.12a5.81,5.81,0,0,0,3.07.76c1.24,0,2.5,0,3.74,0a6,6,0,0,0,3.07-.76l29.65-16.56a98,98,0,0,1,27.56,15.49l.12,33.17a6,6,0,0,0,.91,3.16c.64,1,1.27,2.08,1.86,3.14a6,6,0,0,0,2.27,2.3L224.7,112.6A93,93,0,0,1,224.73,143.39Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm109.94-52.79a8,8,0,0,0-3.89-5.4l-29.83-17-.12-33.62a8,8,0,0,0-2.83-6.08,111.91,111.91,0,0,0-36.72-20.67,8,8,0,0,0-6.46.59L128,41.85,97.88,25a8,8,0,0,0-6.47-.6A112.1,112.1,0,0,0,54.73,45.15a8,8,0,0,0-2.83,6.07l-.15,33.65-29.83,17a8,8,0,0,0-3.89,5.4,106.47,106.47,0,0,0,0,41.56,8,8,0,0,0,3.89,5.4l29.83,17,.12,33.62a8,8,0,0,0,2.83,6.08,111.91,111.91,0,0,0,36.72,20.67,8,8,0,0,0,6.46-.59L128,214.15,158.12,231a7.91,7.91,0,0,0,3.9,1,8.09,8.09,0,0,0,2.57-.42,112.1,112.1,0,0,0,36.68-20.73,8,8,0,0,0,2.83-6.07l.15-33.65,29.83-17a8,8,0,0,0,3.89-5.4A106.47,106.47,0,0,0,237.94,107.21Zm-15,34.91-28.57,16.25a8,8,0,0,0-3,3c-.58,1-1.19,2.06-1.81,3.06a7.94,7.94,0,0,0-1.22,4.21l-.15,32.25a95.89,95.89,0,0,1-25.37,14.3L134,199.13a8,8,0,0,0-3.91-1h-.19c-1.21,0-2.43,0-3.64,0a8.08,8.08,0,0,0-4.1,1l-28.84,16.1A96,96,0,0,1,67.88,201l-.11-32.2a8,8,0,0,0-1.22-4.22c-.62-1-1.23-2-1.8-3.06a8.09,8.09,0,0,0-3-3.06l-28.6-16.29a90.49,90.49,0,0,1,0-28.26L61.67,97.63a8,8,0,0,0,3-3c.58-1,1.19-2.06,1.81-3.06a7.94,7.94,0,0,0,1.22-4.21l.15-32.25a95.89,95.89,0,0,1,25.37-14.3L122,56.87a8,8,0,0,0,4.1,1c1.21,0,2.43,0,3.64,0a8.08,8.08,0,0,0,4.1-1l28.84-16.1A96,96,0,0,1,188.12,55l.11,32.2a8,8,0,0,0,1.22,4.22c.62,1,1.23,2,1.8,3.06a8.09,8.09,0,0,0,3,3.06l28.6,16.29A90.49,90.49,0,0,1,222.9,142.12Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M128,84a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,84Zm0,80a36,36,0,1,1,36-36A36,36,0,0,1,128,164Zm106-56a4,4,0,0,0-2-2.7l-30.89-17.6q-.47-.82-1-1.62L200.1,51.2a3.94,3.94,0,0,0-1.42-3,107.8,107.8,0,0,0-35.41-19.94,4,4,0,0,0-3.23.29L129,45.87h-2l-31-17.36a4,4,0,0,0-3.23-.3,108.05,108.05,0,0,0-35.39,20,4,4,0,0,0-1.41,3l-.16,34.9-1,1.62L23.9,105.3A4,4,0,0,0,22,108a102.76,102.76,0,0,0,0,40,4,4,0,0,0,1.95,2.7l30.89,17.6q.47.83,1,1.62l.12,34.87a3.94,3.94,0,0,0,1.42,3,107.8,107.8,0,0,0,35.41,19.94,4,4,0,0,0,3.23-.29L127,210.13h2l31,17.36a4,4,0,0,0,3.23.3,108.05,108.05,0,0,0,35.39-20,4,4,0,0,0,1.41-3l.16-34.9,1-1.62L232.1,150.7a4,4,0,0,0,2-2.71A102.76,102.76,0,0,0,234,108Zm-7.48,36.67L196.3,161.84a4,4,0,0,0-1.51,1.53c-.61,1.09-1.25,2.17-1.91,3.24a3.92,3.92,0,0,0-.61,2.1l-.16,34.15a99.8,99.8,0,0,1-29.7,16.77l-30.4-17a4.06,4.06,0,0,0-2-.51H130c-1.28,0-2.57,0-3.84,0a4.1,4.1,0,0,0-2.05.51l-30.45,17A100.23,100.23,0,0,1,63.89,202.9l-.12-34.12a3.93,3.93,0,0,0-.61-2.11c-.66-1-1.3-2.14-1.91-3.23a4,4,0,0,0-1.51-1.53L29.49,144.68a94.78,94.78,0,0,1,0-33.34L59.7,94.16a4,4,0,0,0,1.51-1.53c.61-1.09,1.25-2.17,1.91-3.23a4,4,0,0,0,.61-2.11l.16-34.15a99.8,99.8,0,0,1,29.7-16.77l30.4,17a4.1,4.1,0,0,0,2.05.51c1.28,0,2.57,0,3.84,0a4,4,0,0,0,2.05-.51l30.45-17A100.23,100.23,0,0,1,192.11,53.1l.12,34.12a3.93,3.93,0,0,0,.61,2.11c.66,1,1.3,2.14,1.91,3.23a4,4,0,0,0,1.51,1.53l30.25,17.23A94.78,94.78,0,0,1,226.54,144.66Z" }))
  ]
]);
const e$8 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M184,20H72A20,20,0,0,0,52,40V76a20.1,20.1,0,0,0,8,16l48,36L60,164a20.1,20.1,0,0,0-8,16v36a20,20,0,0,0,20,20H184a20,20,0,0,0,20-20V180.36a20.13,20.13,0,0,0-7.94-16L147.9,128l48.16-36.4a20.13,20.13,0,0,0,7.94-16V40A20,20,0,0,0,184,20Zm-4,24V60H76V44Zm-52,69L89.33,84h77Zm52,99H76V182l52-39,52,39.33Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(
      "path",
      {
        d: "M192,64V75.64A8,8,0,0,1,188.82,82L128,128,67.2,82.4A8,8,0,0,1,64,76V64Z",
        opacity: "0.2"
      }
    ), /* @__PURE__ */ reactExports.createElement("path", { d: "M184,24H72A16,16,0,0,0,56,40V76a16.07,16.07,0,0,0,6.4,12.8L114.67,128,62.4,167.2A16.07,16.07,0,0,0,56,180v36a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V180.36a16.09,16.09,0,0,0-6.35-12.77L141.27,128l52.38-39.59A16.09,16.09,0,0,0,200,75.64V40A16,16,0,0,0,184,24Zm0,16V56H72V40Zm0,176H72V180l56-42,56,42.35Zm-56-98L72,76V72H184v3.64Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M200,75.64V40a16,16,0,0,0-16-16H72A16,16,0,0,0,56,40V76a16.07,16.07,0,0,0,6.4,12.8L114.67,128,62.4,167.2A16.07,16.07,0,0,0,56,180v36a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V180.36a16.09,16.09,0,0,0-6.35-12.77L141.27,128l52.38-39.59A16.09,16.09,0,0,0,200,75.64ZM184,40V64H72V40Zm0,176H72V180l56-42,56,42.35Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M184,26H72A14,14,0,0,0,58,40V76a14.06,14.06,0,0,0,5.6,11.2L118,128,63.6,168.8A14.06,14.06,0,0,0,58,180v36a14,14,0,0,0,14,14H184a14,14,0,0,0,14-14V180.36a14.08,14.08,0,0,0-5.56-11.17L138,128l54.49-41.19A14.08,14.08,0,0,0,198,75.64V40A14,14,0,0,0,184,26ZM72,38H184a2,2,0,0,1,2,2V58H70V40A2,2,0,0,1,72,38ZM186,180.36V216a2,2,0,0,1-2,2H72a2,2,0,0,1-2-2V180a2,2,0,0,1,.8-1.6L128,135.51l57.22,43.25A2,2,0,0,1,186,180.36Zm-.79-103.12L128,120.49,70.8,77.6A2,2,0,0,1,70,76V70H186v5.64A2,2,0,0,1,185.21,77.24Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M184,24H72A16,16,0,0,0,56,40V76a16.07,16.07,0,0,0,6.4,12.8L114.67,128,62.4,167.2A16.07,16.07,0,0,0,56,180v36a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V180.36a16.09,16.09,0,0,0-6.35-12.77L141.27,128l52.38-39.6A16.05,16.05,0,0,0,200,75.64V40A16,16,0,0,0,184,24Zm0,16V56H72V40Zm0,176H72V180l56-42,56,42.35Zm-56-98L72,76V72H184v3.64Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M184,28H72A12,12,0,0,0,60,40V76a12,12,0,0,0,4.8,9.6L121.33,128,64.8,170.4A12,12,0,0,0,60,180v36a12,12,0,0,0,12,12H184a12,12,0,0,0,12-12V180.36a12.05,12.05,0,0,0-4.76-9.57L134.63,128l56.61-42.79A12.05,12.05,0,0,0,196,75.64V40A12,12,0,0,0,184,28ZM72,36H184a4,4,0,0,1,4,4V60H68V40A4,4,0,0,1,72,36ZM188,180.36V216a4,4,0,0,1-4,4H72a4,4,0,0,1-4-4V180a4,4,0,0,1,1.6-3.2L128,133l58.42,44.16A4,4,0,0,1,188,180.36ZM186.41,78.83,128,123,69.6,79.2A4,4,0,0,1,68,76V68H188v7.64A4,4,0,0,1,186.41,78.83Z" }))
  ]
]);
const e$7 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M144,96a16,16,0,1,1,16,16A16,16,0,0,1,144,96Zm92-40V200a20,20,0,0,1-20,20H40a20,20,0,0,1-20-20V56A20,20,0,0,1,40,36H216A20,20,0,0,1,236,56ZM44,60v79.72l33.86-33.86a20,20,0,0,1,28.28,0L147.31,147l17.18-17.17a20,20,0,0,1,28.28,0L212,149.09V60Zm0,136H162.34L92,125.66l-48,48Zm168,0V183l-33.37-33.37L164.28,164l32,32Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(
      "path",
      {
        d: "M224,56V178.06l-39.72-39.72a8,8,0,0,0-11.31,0L147.31,164,97.66,114.34a8,8,0,0,0-11.32,0L32,168.69V56a8,8,0,0,1,8-8H216A8,8,0,0,1,224,56Z",
        opacity: "0.2"
      }
    ), /* @__PURE__ */ reactExports.createElement("path", { d: "M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM156,88a12,12,0,1,1-12,12A12,12,0,0,1,156,88Zm60,112H40V160.69l46.34-46.35a8,8,0,0,1,11.32,0h0L165,181.66a8,8,0,0,0,11.32-11.32l-17.66-17.65L173,138.34a8,8,0,0,1,11.31,0L216,170.07V200Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M216,42H40A14,14,0,0,0,26,56V200a14,14,0,0,0,14,14H216a14,14,0,0,0,14-14V56A14,14,0,0,0,216,42ZM40,54H216a2,2,0,0,1,2,2V163.57L188.53,134.1a14,14,0,0,0-19.8,0l-21.42,21.42L101.9,110.1a14,14,0,0,0-19.8,0L38,154.2V56A2,2,0,0,1,40,54ZM38,200V171.17l52.58-52.58a2,2,0,0,1,2.84,0L176.83,202H40A2,2,0,0,1,38,200Zm178,2H193.8l-38-38,21.41-21.42a2,2,0,0,1,2.83,0l38,38V200A2,2,0,0,1,216,202ZM146,100a10,10,0,1,1,10,10A10,10,0,0,1,146,100Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M216,44H40A12,12,0,0,0,28,56V200a12,12,0,0,0,12,12H216a12,12,0,0,0,12-12V56A12,12,0,0,0,216,44ZM40,52H216a4,4,0,0,1,4,4V168.4l-32.89-32.89a12,12,0,0,0-17,0l-22.83,22.83-46.82-46.83a12,12,0,0,0-17,0L36,159V56A4,4,0,0,1,40,52ZM36,200V170.34l53.17-53.17a4,4,0,0,1,5.66,0L181.66,204H40A4,4,0,0,1,36,200Zm180,4H193l-40-40,22.83-22.83a4,4,0,0,1,5.66,0L220,179.71V200A4,4,0,0,1,216,204ZM148,100a8,8,0,1,1,8,8A8,8,0,0,1,148,100Z" }))
  ]
]);
const l = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M228,128a12,12,0,0,1-12,12H128a12,12,0,0,1,0-24h88A12,12,0,0,1,228,128ZM128,76h88a12,12,0,0,0,0-24H128a12,12,0,0,0,0,24Zm88,104H128a12,12,0,0,0,0,24h88a12,12,0,0,0,0-24ZM79.51,39.51,56,63l-7.51-7.52a12,12,0,0,0-17,17l16,16a12,12,0,0,0,17,0l32-32a12,12,0,0,0-17-17Zm0,64L56,127l-7.51-7.52a12,12,0,1,0-17,17l16,16a12,12,0,0,0,17,0l32-32a12,12,0,0,0-17-17Zm0,64L56,191l-7.51-7.52a12,12,0,1,0-17,17l16,16a12,12,0,0,0,17,0l32-32a12,12,0,0,0-17-17Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M216,64V192H128V64Z", opacity: "0.2" }), /* @__PURE__ */ reactExports.createElement("path", { d: "M224,128a8,8,0,0,1-8,8H128a8,8,0,0,1,0-16h88A8,8,0,0,1,224,128ZM128,72h88a8,8,0,0,0,0-16H128a8,8,0,0,0,0,16Zm88,112H128a8,8,0,0,0,0,16h88a8,8,0,0,0,0-16ZM82.34,42.34,56,68.69,45.66,58.34A8,8,0,0,0,34.34,69.66l16,16a8,8,0,0,0,11.32,0l32-32A8,8,0,0,0,82.34,42.34Zm0,64L56,132.69,45.66,122.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32,0l32-32a8,8,0,0,0-11.32-11.32Zm0,64L56,196.69,45.66,186.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32,0l32-32a8,8,0,0,0-11.32-11.32Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM117.66,149.66l-32,32a8,8,0,0,1-11.32,0l-16-16a8,8,0,0,1,11.32-11.32L80,164.69l26.34-26.35a8,8,0,0,1,11.32,11.32Zm0-64-32,32a8,8,0,0,1-11.32,0l-16-16A8,8,0,0,1,69.66,90.34L80,100.69l26.34-26.35a8,8,0,0,1,11.32,11.32ZM192,168H144a8,8,0,0,1,0-16h48a8,8,0,0,1,0,16Zm0-64H144a8,8,0,0,1,0-16h48a8,8,0,0,1,0,16Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M222,128a6,6,0,0,1-6,6H128a6,6,0,0,1,0-12h88A6,6,0,0,1,222,128ZM128,70h88a6,6,0,0,0,0-12H128a6,6,0,0,0,0,12Zm88,116H128a6,6,0,0,0,0,12h88a6,6,0,0,0,0-12ZM83.76,43.76,56,71.51,44.24,59.76a6,6,0,0,0-8.48,8.48l16,16a6,6,0,0,0,8.48,0l32-32a6,6,0,0,0-8.48-8.48Zm0,64L56,135.51,44.24,123.76a6,6,0,1,0-8.48,8.48l16,16a6,6,0,0,0,8.48,0l32-32a6,6,0,0,0-8.48-8.48Zm0,64L56,199.51,44.24,187.76a6,6,0,0,0-8.48,8.48l16,16a6,6,0,0,0,8.48,0l32-32a6,6,0,0,0-8.48-8.48Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M224,128a8,8,0,0,1-8,8H128a8,8,0,0,1,0-16h88A8,8,0,0,1,224,128ZM128,72h88a8,8,0,0,0,0-16H128a8,8,0,0,0,0,16Zm88,112H128a8,8,0,0,0,0,16h88a8,8,0,0,0,0-16ZM82.34,42.34,56,68.69,45.66,58.34A8,8,0,0,0,34.34,69.66l16,16a8,8,0,0,0,11.32,0l32-32A8,8,0,0,0,82.34,42.34Zm0,64L56,132.69,45.66,122.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32,0l32-32a8,8,0,0,0-11.32-11.32Zm0,64L56,196.69,45.66,186.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32,0l32-32a8,8,0,0,0-11.32-11.32Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M220,128a4,4,0,0,1-4,4H128a4,4,0,0,1,0-8h88A4,4,0,0,1,220,128ZM128,68h88a4,4,0,0,0,0-8H128a4,4,0,0,0,0,8Zm88,120H128a4,4,0,0,0,0,8h88a4,4,0,0,0,0-8ZM85.17,45.17,56,74.34,42.83,61.17a4,4,0,0,0-5.66,5.66l16,16a4,4,0,0,0,5.66,0l32-32a4,4,0,0,0-5.66-5.66Zm0,64L56,138.34,42.83,125.17a4,4,0,1,0-5.66,5.66l16,16a4,4,0,0,0,5.66,0l32-32a4,4,0,0,0-5.66-5.66Zm0,64L56,202.34,42.83,189.17a4,4,0,0,0-5.66,5.66l16,16a4,4,0,0,0,5.66,0l32-32a4,4,0,0,0-5.66-5.66Z" }))
  ]
]);
const a$3 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M232.49,215.51,185,168a92.12,92.12,0,1,0-17,17l47.53,47.54a12,12,0,0,0,17-17ZM44,112a68,68,0,1,1,68,68A68.07,68.07,0,0,1,44,112Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M192,112a80,80,0,1,1-80-80A80,80,0,0,1,192,112Z", opacity: "0.2" }), /* @__PURE__ */ reactExports.createElement("path", { d: "M229.66,218.34,179.6,168.28a88.21,88.21,0,1,0-11.32,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M168,112a56,56,0,1,1-56-56A56,56,0,0,1,168,112Zm61.66,117.66a8,8,0,0,1-11.32,0l-50.06-50.07a88,88,0,1,1,11.32-11.31l50.06,50.06A8,8,0,0,1,229.66,229.66ZM112,184a72,72,0,1,0-72-72A72.08,72.08,0,0,0,112,184Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M228.24,219.76l-51.38-51.38a86.15,86.15,0,1,0-8.48,8.48l51.38,51.38a6,6,0,0,0,8.48-8.48ZM38,112a74,74,0,1,1,74,74A74.09,74.09,0,0,1,38,112Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M226.83,221.17l-52.7-52.7a84.1,84.1,0,1,0-5.66,5.66l52.7,52.7a4,4,0,0,0,5.66-5.66ZM36,112a76,76,0,1,1,76,76A76.08,76.08,0,0,1,36,112Z" }))
  ]
]);
const e$6 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M160,80a32,32,0,1,0-32-32A32,32,0,0,0,160,80Zm0-40a8,8,0,1,1-8,8A8,8,0,0,1,160,40Zm94.32,153.88L199.76,101.8A19.85,19.85,0,0,0,182.55,92h0a19.83,19.83,0,0,0-17.2,9.8l-18.7,31.55-37.42-63.5a20,20,0,0,0-34.46,0L1.66,193.91A12,12,0,0,0,12,212H244a12,12,0,0,0,10.32-18.12ZM92,87.87,108.57,116H75.43ZM33,188l28.28-48h61.44L151,188Zm145.86,0L160.56,157l22-37.1L222.94,188Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(
      "path",
      {
        d: "M144,52a20,20,0,1,1,20,20A20,20,0,0,1,144,52Zm49.44,55.92a8,8,0,0,0-13.77,0l-33,55.75-21-35.67H50.35L8,200H248Z",
        opacity: "0.2"
      }
    ), /* @__PURE__ */ reactExports.createElement("path", { d: "M164,80a28,28,0,1,0-28-28A28,28,0,0,0,164,80Zm0-40a12,12,0,1,1-12,12A12,12,0,0,1,164,40Zm90.88,155.92-54.56-92.08A15.87,15.87,0,0,0,186.55,96h0a15.85,15.85,0,0,0-13.76,7.84L146.63,148l-44.84-76.1a16,16,0,0,0-27.58,0L1.11,195.94A8,8,0,0,0,8,208H248a8,8,0,0,0,6.88-12.08ZM88,80l23.57,40H64.43ZM22,192l33-56h66l33,56Zm150.57,0-16.66-28.28L186.55,112,234,192Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M254.88,195.92l-54.56-92.08A15.87,15.87,0,0,0,186.55,96h0a15.85,15.85,0,0,0-13.76,7.84l-15.64,26.39a4,4,0,0,0,0,4.07l26.8,45.47a8.13,8.13,0,0,1-1.89,10.55,8,8,0,0,1-11.8-2.26L101.79,71.88a16,16,0,0,0-27.58,0L1.11,195.94a8,8,0,0,0,1,9.52A8.23,8.23,0,0,0,8.23,208H247.77a8.29,8.29,0,0,0,6.09-2.55A8,8,0,0,0,254.88,195.92ZM64.43,120,88,80l23.57,40ZM140,52a24,24,0,1,1,24,24A24,24,0,0,1,140,52Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M164,78a26,26,0,1,0-26-26A26,26,0,0,0,164,78Zm0-40a14,14,0,1,1-14,14A14,14,0,0,1,164,38Zm89.16,158.94L198.6,104.86a13.9,13.9,0,0,0-12-6.86h0a13.88,13.88,0,0,0-12,6.86l-27.88,47.05-46.56-79a14,14,0,0,0-24.13,0L2.83,197A6,6,0,0,0,8,206H248a6,6,0,0,0,5.16-9.06ZM86.27,79a2,2,0,0,1,3.46,0l25.34,43H60.93ZM18.5,194l35.36-60h68.29l19.3,32.77,0,0,16,27.2Zm152.93,0-17.85-30.29L184.83,111a2,2,0,0,1,1.72-1,1.93,1.93,0,0,1,1.72,1l49.2,83Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M164,80a28,28,0,1,0-28-28A28,28,0,0,0,164,80Zm0-40a12,12,0,1,1-12,12A12,12,0,0,1,164,40Zm90.88,155.92-54.56-92.08A15.87,15.87,0,0,0,186.55,96h0a15.85,15.85,0,0,0-13.76,7.84L146.63,148l-44.84-76.1a16,16,0,0,0-27.58,0L1.11,195.94A8,8,0,0,0,8,208H248a8,8,0,0,0,6.88-12.08ZM88,80l23.57,40H64.43ZM22,192l33-56h66l18.74,31.8,0,0L154,192Zm150.57,0-16.66-28.28L186.55,112,234,192Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M164,76a24,24,0,1,0-24-24A24,24,0,0,0,164,76Zm0-40a16,16,0,1,1-16,16A16,16,0,0,1,164,36Zm87.44,162-54.56-92.08A11.91,11.91,0,0,0,186.55,100h0a11.89,11.89,0,0,0-10.32,5.88l-29.61,50L98.34,73.91a12,12,0,0,0-20.68,0L4.55,198A4,4,0,0,0,8,204H248a4,4,0,0,0,3.44-6ZM84.55,78a4,4,0,0,1,6.9,0l27.12,46H57.43ZM15,196l37.71-64h70.58L161,196Zm155.29,0-19-32.29L183.11,110a4,4,0,0,1,6.88,0l51,86Z" }))
  ]
]);
const e$5 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M238.78,183.79,98.28,87.65A40.18,40.18,0,0,0,100,76a40,40,0,1,0-15.29,31.45l30,20.56-30,20.56a40,40,0,1,0,3.57,59.74h0A39.73,39.73,0,0,0,100,180a40.18,40.18,0,0,0-1.72-11.66L136,142.54l89.22,61.06a12,12,0,0,0,13.56-19.81ZM71.31,191.33h0A16,16,0,1,1,76,180,16,16,0,0,1,71.31,191.33ZM48.69,87.3a16,16,0,1,1,22.62,0h0A16,16,0,0,1,48.69,87.3Zm112.82,23.24a12,12,0,0,1,3.13-16.68L225.22,52.4a12,12,0,0,1,13.56,19.81l-60.59,41.46a12,12,0,0,1-16.68-3.13Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(
      "path",
      {
        d: "M40.2,95.8a28,28,0,1,1,39.6,0A28,28,0,0,1,40.2,95.8Zm0,64.4a28,28,0,1,0,39.6,0A28,28,0,0,0,40.2,160.2Z",
        opacity: "0.2"
      }
    ), /* @__PURE__ */ reactExports.createElement("path", { d: "M157.73,113.13A8,8,0,0,1,159.82,102L227.48,55.7a8,8,0,0,1,9,13.21l-67.67,46.3a7.92,7.92,0,0,1-4.51,1.4A8,8,0,0,1,157.73,113.13Zm80.87,85.09a8,8,0,0,1-11.12,2.08L136,137.7,93.49,166.78a36,36,0,1,1-9-13.19L121.83,128,84.44,102.41a35.86,35.86,0,1,1,9-13.19l143,97.87A8,8,0,0,1,238.6,198.22ZM80,180a20,20,0,1,0-5.86,14.14A19.85,19.85,0,0,0,80,180ZM74.14,90.13a20,20,0,1,0-28.28,0A19.85,19.85,0,0,0,74.14,90.13Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M236.52,187.09l-143-97.87a36,36,0,1,0-14.38,17.27l21.39,21.69L79.15,149.54l0,0a35.91,35.91,0,1,0,14.38,17.27l26.91-18.41L170,198.64a32.26,32.26,0,0,0,22.7,9.37,31.52,31.52,0,0,0,4.11-.27l.28,0,36.27-6.11a8,8,0,0,0,3.19-14.5Zm-162.38-97A20,20,0,1,1,80,76,20,20,0,0,1,74.14,90.13Zm0,104A20,20,0,1,1,80,180,20,20,0,0,1,74.14,194.15Zm61-101.5L169.94,57.4a32.19,32.19,0,0,1,26.84-9.14l.28,0,36,6.07a8.21,8.21,0,0,1,6.09,4.42,8,8,0,0,1-2.67,10.12l-69.93,47.85a4,4,0,0,1-4.51,0l-26.31-18A4,4,0,0,1,135.18,92.65Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M159.38,112a6,6,0,0,1,1.57-8.34l67.66-46.31a6,6,0,0,1,6.78,9.91l-67.67,46.3a6,6,0,0,1-8.34-1.56ZM237,197.09a6,6,0,0,1-8.34,1.56L136,135.27,91,166.06A34,34,0,1,1,84,156a1.8,1.8,0,0,0,.19.2L125.37,128,84.23,99.84,84,100a34,34,0,1,1,7-10.1l144.38,98.8A6,6,0,0,1,237,197.09ZM75.56,91.55a22,22,0,1,0-31.12,0,21.88,21.88,0,0,0,31.12,0ZM82,180a22,22,0,1,0-6.44,15.56h0A21.88,21.88,0,0,0,82,180Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M157.73,113.13A8,8,0,0,1,159.82,102L227.48,55.7a8,8,0,0,1,9,13.21l-67.67,46.3a7.92,7.92,0,0,1-4.51,1.4A8,8,0,0,1,157.73,113.13Zm80.87,85.09a8,8,0,0,1-11.12,2.08L136,137.7,93.49,166.78a36,36,0,1,1-9-13.19L121.83,128,84.44,102.41a35.86,35.86,0,1,1,9-13.19l143,97.87A8,8,0,0,1,238.6,198.22ZM80,180a20,20,0,1,0-5.86,14.14A19.85,19.85,0,0,0,80,180ZM74.14,90.13a20,20,0,1,0-28.28,0A19.85,19.85,0,0,0,74.14,90.13Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M161,110.87a4,4,0,0,1,1.05-5.56L229.74,59a4,4,0,0,1,4.52,6.61l-67.67,46.3a4,4,0,0,1-5.56-1ZM235.3,196a4,4,0,0,1-5.56,1L136,132.85,88.47,165.38a32,32,0,1,1-5.84-8c.45.45.89.92,1.31,1.4l45-30.78-45-30.78c-.42.48-.86,1-1.31,1.4a31.86,31.86,0,1,1,5.84-8l49.69,34h0l96.09,65.76A4,4,0,0,1,235.3,196ZM77,93a24.42,24.42,0,0,0,2.82-3.38s0,0,0,0l0,0A24,24,0,1,0,77,93ZM84,180a23.75,23.75,0,0,0-4.15-13.49l0-.06,0,0A24.5,24.5,0,0,0,77,163,24,24,0,1,0,77,197h0A23.85,23.85,0,0,0,84,180Z" }))
  ]
]);
const e$4 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M100,36H56A20,20,0,0,0,36,56v44a20,20,0,0,0,20,20h44a20,20,0,0,0,20-20V56A20,20,0,0,0,100,36ZM96,96H60V60H96ZM200,36H156a20,20,0,0,0-20,20v44a20,20,0,0,0,20,20h44a20,20,0,0,0,20-20V56A20,20,0,0,0,200,36Zm-4,60H160V60h36Zm-96,40H56a20,20,0,0,0-20,20v44a20,20,0,0,0,20,20h44a20,20,0,0,0,20-20V156A20,20,0,0,0,100,136Zm-4,60H60V160H96Zm104-60H156a20,20,0,0,0-20,20v44a20,20,0,0,0,20,20h44a20,20,0,0,0,20-20V156A20,20,0,0,0,200,136Zm-4,60H160V160h36Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(
      "path",
      {
        d: "M112,56v48a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8h48A8,8,0,0,1,112,56Zm88-8H152a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8h48a8,8,0,0,0,8-8V56A8,8,0,0,0,200,48Zm-96,96H56a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8h48a8,8,0,0,0,8-8V152A8,8,0,0,0,104,144Zm96,0H152a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8h48a8,8,0,0,0,8-8V152A8,8,0,0,0,200,144Z",
        opacity: "0.2"
      }
    ), /* @__PURE__ */ reactExports.createElement("path", { d: "M200,136H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48ZM104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M120,56v48a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40h48A16,16,0,0,1,120,56Zm80-16H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm-96,96H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm96,0H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M104,42H56A14,14,0,0,0,42,56v48a14,14,0,0,0,14,14h48a14,14,0,0,0,14-14V56A14,14,0,0,0,104,42Zm2,62a2,2,0,0,1-2,2H56a2,2,0,0,1-2-2V56a2,2,0,0,1,2-2h48a2,2,0,0,1,2,2Zm94-62H152a14,14,0,0,0-14,14v48a14,14,0,0,0,14,14h48a14,14,0,0,0,14-14V56A14,14,0,0,0,200,42Zm2,62a2,2,0,0,1-2,2H152a2,2,0,0,1-2-2V56a2,2,0,0,1,2-2h48a2,2,0,0,1,2,2Zm-98,34H56a14,14,0,0,0-14,14v48a14,14,0,0,0,14,14h48a14,14,0,0,0,14-14V152A14,14,0,0,0,104,138Zm2,62a2,2,0,0,1-2,2H56a2,2,0,0,1-2-2V152a2,2,0,0,1,2-2h48a2,2,0,0,1,2,2Zm94-62H152a14,14,0,0,0-14,14v48a14,14,0,0,0,14,14h48a14,14,0,0,0,14-14V152A14,14,0,0,0,200,138Zm2,62a2,2,0,0,1-2,2H152a2,2,0,0,1-2-2V152a2,2,0,0,1,2-2h48a2,2,0,0,1,2,2Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M104,44H56A12,12,0,0,0,44,56v48a12,12,0,0,0,12,12h48a12,12,0,0,0,12-12V56A12,12,0,0,0,104,44Zm4,60a4,4,0,0,1-4,4H56a4,4,0,0,1-4-4V56a4,4,0,0,1,4-4h48a4,4,0,0,1,4,4Zm92-60H152a12,12,0,0,0-12,12v48a12,12,0,0,0,12,12h48a12,12,0,0,0,12-12V56A12,12,0,0,0,200,44Zm4,60a4,4,0,0,1-4,4H152a4,4,0,0,1-4-4V56a4,4,0,0,1,4-4h48a4,4,0,0,1,4,4ZM104,140H56a12,12,0,0,0-12,12v48a12,12,0,0,0,12,12h48a12,12,0,0,0,12-12V152A12,12,0,0,0,104,140Zm4,60a4,4,0,0,1-4,4H56a4,4,0,0,1-4-4V152a4,4,0,0,1,4-4h48a4,4,0,0,1,4,4Zm92-60H152a12,12,0,0,0-12,12v48a12,12,0,0,0,12,12h48a12,12,0,0,0,12-12V152A12,12,0,0,0,200,140Zm4,60a4,4,0,0,1-4,4H152a4,4,0,0,1-4-4V152a4,4,0,0,1,4-4h48a4,4,0,0,1,4,4Z" }))
  ]
]);
const a$2 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M234.36,170A12,12,0,0,1,230,186.37l-96,56a12,12,0,0,1-12.1,0l-96-56a12,12,0,0,1,12.09-20.74l90,52.48L218,165.63A12,12,0,0,1,234.36,170ZM218,117.63,128,170.11,38.05,117.63A12,12,0,0,0,26,138.37l96,56a12,12,0,0,0,12.1,0l96-56A12,12,0,0,0,218,117.63ZM20,80a12,12,0,0,1,6-10.37l96-56a12.06,12.06,0,0,1,12.1,0l96,56a12,12,0,0,1,0,20.74l-96,56a12,12,0,0,1-12.1,0l-96-56A12,12,0,0,1,20,80Zm35.82,0L128,122.11,200.18,80,128,37.89Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M224,80l-96,56L32,80l96-56Z", opacity: "0.2" }), /* @__PURE__ */ reactExports.createElement("path", { d: "M230.91,172A8,8,0,0,1,228,182.91l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,36,169.09l92,53.65,92-53.65A8,8,0,0,1,230.91,172ZM220,121.09l-92,53.65L36,121.09A8,8,0,0,0,28,134.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,121.09ZM24,80a8,8,0,0,1,4-6.91l96-56a8,8,0,0,1,8.06,0l96,56a8,8,0,0,1,0,13.82l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,24,80Zm23.88,0L128,126.74,208.12,80,128,33.26Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M220,169.09l-92,53.65L36,169.09A8,8,0,0,0,28,182.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,169.09Z" }), /* @__PURE__ */ reactExports.createElement("path", { d: "M220,121.09l-92,53.65L36,121.09A8,8,0,0,0,28,134.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,121.09Z" }), /* @__PURE__ */ reactExports.createElement("path", { d: "M28,86.91l96,56a8,8,0,0,0,8.06,0l96-56a8,8,0,0,0,0-13.82l-96-56a8,8,0,0,0-8.06,0l-96,56a8,8,0,0,0,0,13.82Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M229.18,173a6,6,0,0,1-2.16,8.2l-96,56a6,6,0,0,1-6,0l-96-56a6,6,0,0,1,6-10.36l93,54.23,93-54.23A6,6,0,0,1,229.18,173ZM221,122.82l-93,54.23L35,122.82a6,6,0,0,0-6,10.36l96,56a6,6,0,0,0,6,0l96-56a6,6,0,0,0-6-10.36ZM26,80a6,6,0,0,1,3-5.18l96-56a6,6,0,0,1,6,0l96,56a6,6,0,0,1,0,10.36l-96,56a6,6,0,0,1-6,0l-96-56A6,6,0,0,1,26,80Zm17.91,0L128,129.05,212.09,80,128,31Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M230.91,172A8,8,0,0,1,228,182.91l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,36,169.09l92,53.65,92-53.65A8,8,0,0,1,230.91,172ZM220,121.09l-92,53.65L36,121.09A8,8,0,0,0,28,134.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,121.09ZM24,80a8,8,0,0,1,4-6.91l96-56a8,8,0,0,1,8.06,0l96,56a8,8,0,0,1,0,13.82l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,24,80Zm23.88,0L128,126.74,208.12,80,128,33.26Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M227.45,174a4,4,0,0,1-1.44,5.48l-96,56a4,4,0,0,1-4,0l-96-56a4,4,0,0,1,4-6.92l94,54.83,94-54.83A4,4,0,0,1,227.45,174ZM222,124.54l-94,54.83L34,124.54a4,4,0,0,0-4,6.92l96,56a4,4,0,0,0,4,0l96-56a4,4,0,0,0-4-6.92ZM28,80a4,4,0,0,1,2-3.46l96-56a4,4,0,0,1,4,0l96,56a4,4,0,0,1,0,6.92l-96,56a4,4,0,0,1-4,0l-96-56A4,4,0,0,1,28,80Zm11.94,0L128,131.37,216.06,80,128,28.63Z" }))
  ]
]);
const a$1 = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(
      "path",
      {
        d: "M216,56V200a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40H200A16,16,0,0,1,216,56Z",
        opacity: "0.2"
      }
    ), /* @__PURE__ */ reactExports.createElement("path", { d: "M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM181.66,170.34a8,8,0,0,1-11.32,11.32L128,139.31,85.66,181.66a8,8,0,0,1-11.32-11.32L116.69,128,74.34,85.66A8,8,0,0,1,85.66,74.34L128,116.69l42.34-42.35a8,8,0,0,1,11.32,11.32L139.31,128Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M204.24,195.76a6,6,0,1,1-8.48,8.48L128,136.49,60.24,204.24a6,6,0,0,1-8.48-8.48L119.51,128,51.76,60.24a6,6,0,0,1,8.48-8.48L128,119.51l67.76-67.75a6,6,0,0,1,8.48,8.48L136.49,128Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M202.83,197.17a4,4,0,0,1-5.66,5.66L128,133.66,58.83,202.83a4,4,0,0,1-5.66-5.66L122.34,128,53.17,58.83a4,4,0,0,1,5.66-5.66L128,122.34l69.17-69.17a4,4,0,1,1,5.66,5.66L133.66,128Z" }))
  ]
]);
const a = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M168.49,104.49,145,128l23.52,23.51a12,12,0,0,1-17,17L128,145l-23.51,23.52a12,12,0,0,1-17-17L111,128,87.51,104.49a12,12,0,0,1,17-17L128,111l23.51-23.52a12,12,0,0,1,17,17ZM236,128A108,108,0,1,1,128,20,108.12,108.12,0,0,1,236,128Zm-24,0a84,84,0,1,0-84,84A84.09,84.09,0,0,0,212,128Z" }))
  ],
  [
    "duotone",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z", opacity: "0.2" }), /* @__PURE__ */ reactExports.createElement("path", { d: "M165.66,101.66,139.31,128l26.35,26.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z" }))
  ],
  [
    "fill",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm37.66,130.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32L139.31,128Z" }))
  ],
  [
    "light",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M164.24,100.24,136.48,128l27.76,27.76a6,6,0,1,1-8.48,8.48L128,136.48l-27.76,27.76a6,6,0,0,1-8.48-8.48L119.52,128,91.76,100.24a6,6,0,0,1,8.48-8.48L128,119.52l27.76-27.76a6,6,0,0,1,8.48,8.48ZM230,128A102,102,0,1,1,128,26,102.12,102.12,0,0,1,230,128Zm-12,0a90,90,0,1,0-90,90A90.1,90.1,0,0,0,218,128Z" }))
  ],
  [
    "regular",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M165.66,101.66,139.31,128l26.35,26.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z" }))
  ],
  [
    "thin",
    /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("path", { d: "M162.83,98.83,133.66,128l29.17,29.17a4,4,0,0,1-5.66,5.66L128,133.66,98.83,162.83a4,4,0,0,1-5.66-5.66L122.34,128,93.17,98.83a4,4,0,0,1,5.66-5.66L128,122.34l29.17-29.17a4,4,0,1,1,5.66,5.66ZM228,128A100,100,0,1,1,128,28,100.11,100.11,0,0,1,228,128Zm-8,0a92,92,0,1,0-92,92A92.1,92.1,0,0,0,220,128Z" }))
  ]
]);
const o$a = reactExports.createContext({
  color: "currentColor",
  size: "1em",
  weight: "regular",
  mirrored: false
});
const p$1 = reactExports.forwardRef(
  (s2, a2) => {
    const {
      alt: n2,
      color: r2,
      size: t2,
      weight: o2,
      mirrored: c2,
      children: i2,
      weights: m2,
      ...x2
    } = s2, {
      color: d = "currentColor",
      size: l2,
      weight: f2 = "regular",
      mirrored: g = false,
      ...w2
    } = reactExports.useContext(o$a);
    return /* @__PURE__ */ reactExports.createElement(
      "svg",
      {
        ref: a2,
        xmlns: "http://www.w3.org/2000/svg",
        width: t2 != null ? t2 : l2,
        height: t2 != null ? t2 : l2,
        fill: r2 != null ? r2 : d,
        viewBox: "0 0 256 256",
        transform: c2 || g ? "scale(-1, 1)" : void 0,
        ...w2,
        ...x2
      },
      !!n2 && /* @__PURE__ */ reactExports.createElement("title", null, n2),
      i2,
      m2.get(o2 != null ? o2 : f2)
    );
  }
);
p$1.displayName = "IconBase";
const r$4 = reactExports.forwardRef((e2, c2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: c2, ...e2, weights: a$b }));
r$4.displayName = "ArrowClockwiseIcon";
const m$4 = r$4;
const r$3 = reactExports.forwardRef((t2, e2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: e2, ...t2, weights: a$a }));
r$3.displayName = "ArrowRightIcon";
const s$8 = r$3;
const i = reactExports.forwardRef((e2, r2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: r2, ...e2, weights: e$a }));
i.displayName = "BuildingsIcon";
const m$3 = i;
const o$9 = reactExports.forwardRef((t2, r2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: r2, ...t2, weights: e$9 }));
o$9.displayName = "CaretDoubleLeftIcon";
const s$7 = o$9;
const o$8 = reactExports.forwardRef((t2, r2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: r2, ...t2, weights: a$9 }));
o$8.displayName = "CaretDoubleRightIcon";
const s$6 = o$8;
const e$3 = reactExports.forwardRef((r2, t2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: t2, ...r2, weights: t$4 }));
e$3.displayName = "CaretDownIcon";
const s$5 = e$3;
const e$2 = reactExports.forwardRef((o2, r2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: r2, ...o2, weights: t$3 }));
e$2.displayName = "CaretRightIcon";
const s$4 = e$2;
const c$2 = reactExports.forwardRef((o2, r2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: r2, ...o2, weights: a$8 }));
c$2.displayName = "CheckCircleIcon";
const s$3 = c$2;
const c$1 = reactExports.forwardRef((e2, r2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: r2, ...e2, weights: a$7 }));
c$1.displayName = "ClockIcon";
const n$7 = c$1;
const o$7 = reactExports.forwardRef((r2, t2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: t2, ...r2, weights: l$2 }));
o$7.displayName = "CubeIcon";
const n$6 = o$7;
const r$2 = reactExports.forwardRef((a2, o2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: o2, ...a2, weights: a$6 }));
r$2.displayName = "CubeTransparentIcon";
const p = r$2;
const o$6 = reactExports.forwardRef((r2, t2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: t2, ...r2, weights: a$5 }));
o$6.displayName = "DotsThreeIcon";
const n$5 = o$6;
const o$5 = reactExports.forwardRef((r2, t2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: t2, ...r2, weights: a$4 }));
o$5.displayName = "EyeIcon";
const n$4 = o$5;
const e$1 = reactExports.forwardRef((r2, t2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: t2, ...r2, weights: t$2 }));
e$1.displayName = "FolderIcon";
const n$3 = e$1;
const o$4 = reactExports.forwardRef((r2, a2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: a2, ...r2, weights: l$1 }));
o$4.displayName = "GearSixIcon";
const s$2 = o$4;
const r$1 = reactExports.forwardRef((s2, a2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: a2, ...s2, weights: e$8 }));
r$1.displayName = "HourglassHighIcon";
const c = r$1;
const o$3 = reactExports.forwardRef((a2, m2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: m2, ...a2, weights: e$7 }));
o$3.displayName = "ImageIcon";
const I = o$3;
const o$2 = reactExports.forwardRef((s2, t2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: t2, ...s2, weights: l }));
o$2.displayName = "ListChecksIcon";
const m$2 = o$2;
const o$1 = reactExports.forwardRef((s2, n2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: n2, ...s2, weights: a$3 }));
o$1.displayName = "MagnifyingGlassIcon";
const f = o$1;
const t$1 = reactExports.forwardRef((n2, a2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: a2, ...n2, weights: e$6 }));
t$1.displayName = "MountainsIcon";
const m$1 = t$1;
const s$1 = reactExports.forwardRef((r2, c2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: c2, ...r2, weights: e$5 }));
s$1.displayName = "ScissorsIcon";
const m = s$1;
const r = reactExports.forwardRef((e2, a2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: a2, ...e2, weights: e$4 }));
r.displayName = "SquaresFourIcon";
const n$2 = r;
const t = reactExports.forwardRef((a2, c2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: c2, ...a2, weights: a$2 }));
t.displayName = "StackIcon";
const n$1 = t;
const e = reactExports.forwardRef((r2, t2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: t2, ...r2, weights: a$1 }));
e.displayName = "XIcon";
const n = e;
const o = reactExports.forwardRef((r2, c2) => /* @__PURE__ */ reactExports.createElement(p$1, { ref: c2, ...r2, weights: a }));
o.displayName = "XCircleIcon";
const s = o;
typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
  var e2 = new Error(message);
  return e2.name = "SuppressedError", e2.error = error, e2.suppressed = suppressed, e2;
};
async function invoke(cmd, args = {}, options) {
  return window.__TAURI_INTERNALS__.invoke(cmd, args, options);
}
function friendlyError(err) {
  if (err instanceof Error && err.message.trim()) {
    return enhanceErrorMessage(err.message);
  }
  if (typeof err === "string" && err.trim()) {
    return enhanceErrorMessage(err);
  }
  if (err && typeof err === "object") {
    const value = err;
    if (typeof value.message === "string" && value.message.trim()) {
      return enhanceErrorMessage(value.message);
    }
    if (typeof value.error === "string" && value.error.trim()) {
      return enhanceErrorMessage(value.error);
    }
    if (typeof value.detail === "string" && value.detail.trim()) {
      return enhanceErrorMessage(value.detail);
    }
    if (value.detail && typeof value.detail === "object") {
      const detail = value.detail;
      if (typeof detail.message === "string" && detail.message.trim()) {
        return enhanceErrorMessage(detail.message);
      }
    }
  }
  return "发生未知错误，请查看任务日志。";
}
function enhanceErrorMessage(msg) {
  if (msg.includes("GRID_SPATIAL_MISMATCH") || msg.includes("spatial mismatch")) {
    return '稀疏网格不支持 · 原因：数据块不连续或分布不规则 · 您可以：(1) 使用"仅转换"跳过顶层重建，或 (2) 切换到连续规则网格数据（≤16×16）';
  }
  return msg;
}
function resolveApiBase() {
  const fromEnv = "".replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)) {
    return "http://127.0.0.1:8787";
  }
  return "";
}
const API_BASE = resolveApiBase();
function absolutizeLocalUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url) || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  if (url.startsWith("/") && API_BASE) {
    return `${API_BASE}${url}`;
  }
  return url;
}
class ApiError extends Error {
  status;
  body;
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}
async function request(path, init) {
  const url = `${API_BASE}${path}`;
  let res;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.body ? { "Content-Type": "application/json" } : {},
        ...init?.headers
      }
    });
  } catch {
    throw new ApiError("无法连接后端服务，请确认本地 API（8787）已启动。", 0);
  }
  const text = await res.text();
  let data = void 0;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    let msg = null;
    if (data && typeof data === "object") {
      const d = data;
      if (typeof d.message === "string") msg = d.message;
      else if (typeof d.detail === "string") msg = d.detail;
      else if (d.detail && typeof d.detail === "object" && d.detail !== null) {
        const detail = d.detail;
        if (typeof detail.message === "string") msg = detail.message;
      }
    }
    if (!msg && typeof data === "string" && data.trim()) msg = data;
    throw new ApiError(msg || `请求失败（HTTP ${res.status}）`, res.status, data);
  }
  return data;
}
function pathOf(v2) {
  if (!v2) return "";
  if (typeof v2 === "string") return v2;
  return v2.path || "";
}
const STAGE_DEFS = [
  { id: "scan", label: "扫描" },
  { id: "convert", label: "转换" },
  { id: "rebuild", label: "顶层重建" },
  { id: "texture", label: "纹理" },
  { id: "check", label: "检查" }
];
function textureIsKeep(opts) {
  const mode = (opts?.texture?.mode || "keep").toLowerCase();
  return mode === "keep" || mode === "none" || mode === "" || mode === "passthrough";
}
function deriveStages(api2) {
  if (["merge-tilesets", "clip-tileset", "flatten-tileset", "convert-ifc", "convert-terrain"].includes(api2.operation)) {
    const middle = {
      "flatten-tileset": { id: "flatten", label: "压平几何与侧壁" },
      "clip-tileset": { id: "clip", label: "裁剪几何" },
      "merge-tilesets": { id: "merge", label: "合并" },
      "convert-ifc": { id: "convert", label: "IFC 转换" },
      "convert-terrain": { id: "convert", label: "预处理与切片" }
    }[api2.operation];
    const definitions = [
      { id: "scan", label: "检查输入" },
      middle,
      { id: "validate", label: "检查成果" },
      { id: "commit", label: "提交成果" }
    ];
    const detail = typeof api2.progress === "object" && api2.progress ? api2.progress : {};
    const stage2 = api2.stage === "check" ? "validate" : typeof detail.failedStage === "string" ? detail.failedStage : api2.stage;
    const index2 = definitions.findIndex((d) => d.id === stage2);
    const succeeded = api2.status === "succeeded" || api2.status === "completed";
    return definitions.map((d, i2) => ({ ...d, status: succeeded || index2 >= 0 && i2 < index2 ? "done" : i2 === index2 ? api2.status === "failed" ? "failed" : api2.status === "cancelled" || api2.status === "interrupted" ? "pending" : "running" : "pending" }));
  }
  const stage = (api2.stage || "").toLowerCase();
  const status = (api2.status || "").toLowerCase();
  const opts = api2.options || {};
  const op = (api2.operation || "").toLowerCase();
  const rebuildOpts = opts.rebuildTop;
  const rebuildOn = rebuildOpts?.enabled === true;
  const rebuildLevels = Number(rebuildOpts?.levels || 0);
  const keepTexture = textureIsKeep(opts);
  const skipConvert = op === "process-tileset" || op === "rebuild-top";
  const skipRebuild = !rebuildOn && op !== "rebuild-top";
  const order = STAGE_DEFS.map((d) => d.id);
  const effective = stage === "done" || stage === "cancelled" ? "check" : stage;
  let idx = order.indexOf(effective);
  if (stage === "done") idx = order.length;
  function baseSkip(defId) {
    if (defId === "convert" && skipConvert) {
      return { id: defId, label: "转换", status: "skipped", message: "本操作无需转换" };
    }
    if (defId === "rebuild" && skipRebuild && op !== "rebuild-top") {
      return { id: defId, label: "顶层重建", status: "skipped", message: "未启用" };
    }
    if (defId === "texture" && keepTexture) {
      return { id: defId, label: "纹理", status: "skipped", message: "keep（跳过）" };
    }
    if (defId === "texture" && !keepTexture) {
      return null;
    }
    return null;
  }
  return STAGE_DEFS.map((def, i2) => {
    const label = def.id === "rebuild" && (rebuildOn || op === "rebuild-top") ? rebuildLevels > 0 ? `顶层重建 · L${rebuildLevels}` : "顶层重建 · 到根" : def.label;
    if (status === "failed" && stage === def.id) {
      return { id: def.id, label, status: "failed", message: api2.error || "失败" };
    }
    if (status === "succeeded" || status === "completed" || stage === "done") {
      const sk2 = baseSkip(def.id);
      if (sk2) return sk2;
      if (def.id === "texture" && !keepTexture) {
        const prog = typeof api2.progress === "object" && api2.progress ? api2.progress : {};
        const mode = (opts?.texture?.mode || "ktx2").toLowerCase();
        if (status === "failed" || api2.error) {
          return { id: def.id, label, status: "failed", message: api2.error || "KTX2 失败" };
        }
        return {
          id: def.id,
          label,
          status: "done",
          message: typeof prog.textureMode === "string" ? `KTX2 ${String(prog.textureMode)}` : `KTX2 ${mode}`
        };
      }
      return { id: def.id, label, status: "done" };
    }
    if (status === "cancelled" || status === "interrupted") {
      const sk2 = baseSkip(def.id);
      if (sk2 && (idx < 0 || i2 < idx || def.id === "convert" || def.id === "rebuild" || def.id === "texture" && keepTexture)) {
        if (def.id === "convert" || def.id === "rebuild" || def.id === "texture" && keepTexture && idx >= order.indexOf("texture")) {
          return sk2;
        }
      }
      if (def.id === "convert" && skipConvert) return { id: def.id, label, status: "skipped", message: "本操作无需转换" };
      if (def.id === "rebuild" && skipRebuild) return { id: def.id, label, status: "skipped", message: "未启用" };
      const cancelIdx = order.indexOf(stage === "cancelled" ? "scan" : stage);
      const cidx = cancelIdx >= 0 ? cancelIdx : idx;
      if (cidx >= 0 && i2 < cidx) {
        const sk22 = baseSkip(def.id);
        return sk22 || { id: def.id, label, status: "done" };
      }
      if (i2 === cidx || stage === "cancelled" && i2 === 0 && status === "cancelled" && !api2.startedAt) {
        return { id: def.id, label, status: "failed", message: status };
      }
      return { id: def.id, label, status: "pending" };
    }
    if (status === "queued" || idx < 0) {
      if (def.id === "convert" && skipConvert) return { id: def.id, label, status: "skipped", message: "本操作无需转换" };
      if (def.id === "rebuild" && skipRebuild) return { id: def.id, label, status: "skipped", message: "未启用" };
      if (def.id === "texture" && keepTexture) return { id: def.id, label, status: "pending", message: "将跳过 (keep)" };
      if (status === "running" && i2 === 0) return { id: def.id, label, status: "running" };
      return { id: def.id, label, status: "pending" };
    }
    if (i2 < idx) {
      const sk2 = baseSkip(def.id);
      if (sk2) return sk2;
      return { id: def.id, label, status: "done" };
    }
    if (i2 === idx) {
      if (def.id === "texture" && keepTexture) {
        return { id: def.id, label, status: "skipped", message: "keep（跳过）" };
      }
      return {
        id: def.id,
        label,
        status: status === "running" || status === "cancelling" ? "running" : "pending",
        message: def.id === "texture" && !keepTexture ? "KTX2 压缩中…" : void 0
      };
    }
    if (def.id === "convert" && skipConvert) return { id: def.id, label, status: "skipped", message: "本操作无需转换" };
    if (def.id === "rebuild" && skipRebuild) return { id: def.id, label, status: "skipped", message: "未启用" };
    if (def.id === "texture" && keepTexture) return { id: def.id, label, status: "pending", message: "将跳过 (keep)" };
    return { id: def.id, label, status: "pending" };
  });
}
function normalizeTask(api2) {
  const progressObj = typeof api2.progress === "object" && api2.progress ? api2.progress : {};
  const progressNum = typeof api2.progress === "number" ? api2.progress : void 0;
  return {
    id: api2.id,
    name: api2.taskName || api2.id,
    taskName: api2.taskName,
    operation: api2.operation,
    status: api2.status || "queued",
    input: pathOf(api2.input),
    output: pathOf(api2.output),
    options: api2.options,
    progress: progressNum ?? progressObj,
    stage: api2.stage,
    stages: deriveStages(api2),
    log: api2.log,
    logPath: api2.logPath,
    createdAt: api2.createdAt,
    updatedAt: api2.updatedAt,
    error: api2.error || void 0,
    message: api2.error || void 0,
    artifactId: typeof progressObj.artifactId === "string" ? progressObj.artifactId : void 0,
    artifactPath: typeof progressObj.path === "string" ? progressObj.path : void 0
  };
}
const api$1 = {
  baseUrl: API_BASE || (typeof window !== "undefined" ? window.location.origin : ""),
  health: () => request("/api/health"),
  capabilities: () => request("/api/capabilities"),
  scanOsgb: (path) => request("/api/osgb/scan", {
    method: "POST",
    body: JSON.stringify({ path })
  }).then((r2) => {
    const summary = r2.summary || {};
    return {
      ...r2,
      hasMetadata: r2.hasMetadata ?? Boolean(r2.metadata?.path || summary.srs || !(r2.errors || []).some((e2) => e2.includes("metadata"))),
      hasDataDir: r2.hasDataDir ?? !(r2.errors || []).some((e2) => e2.includes("Data/")),
      tileCount: r2.tileCount ?? summary.tileCount ?? (r2.tiles ? r2.tiles.length : void 0),
      message: r2.message || (r2.valid ? "输入目录校验通过。" : (r2.errors || []).join("; "))
    };
  }),
  listTasks: async () => {
    const data = await request("/api/tasks");
    const list = Array.isArray(data) ? data : data.tasks || [];
    return list.map(normalizeTask);
  },
  getTask: async (id2) => {
    const data = await request(`/api/tasks/${encodeURIComponent(id2)}`);
    const task = "task" in data ? data.task : data;
    return normalizeTask(task);
  },
  createTask: async (body) => {
    const input = typeof body.input === "string" ? { path: body.input } : body.input;
    const output = typeof body.output === "string" ? { path: body.output } : body.output;
    const payload = {
      operation: body.operation,
      input,
      output,
      options: body.options,
      taskName: body.taskName || body.name
    };
    const res = await request("/api/tasks", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return res;
  },
  cancelTask: (id2) => request(`/api/tasks/${encodeURIComponent(id2)}/cancel`, { method: "POST" }),
  getTaskLogs: (id2, tail = 500) => request(
    `/api/tasks/${encodeURIComponent(id2)}/logs?tail=${tail}`
  ),
  listArtifacts: async () => {
    const data = await request("/api/artifacts");
    return data.artifacts || [];
  },
  previewUrl: async (id2) => {
    const res = await request(
      `/api/artifacts/${encodeURIComponent(id2)}/preview-url`
    );
    const url = res.url || res.previewUrl || "";
    const abs = absolutizeLocalUrl(url);
    return { ...res, url: abs, previewUrl: abs || res.previewUrl };
  },
  prepareOsgb: (path) => request("/api/preview/osgb/prepare", {
    method: "POST",
    body: JSON.stringify({ path })
  }),
  nativeOsgbPreview: (path) => request("/api/preview/osgb/native", {
    method: "POST",
    body: JSON.stringify({ path })
  })
};
function isActiveStatus(status) {
  return status === "running" || status === "queued" || status === "cancelling";
}
function isDoneStatus(status) {
  return status === "succeeded" || status === "completed" || status === "failed" || status === "cancelled" || status === "interrupted";
}
function isTauri() {
  return typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);
}
async function tauriInvoke(cmd, args) {
  return invoke(cmd, args);
}
const SETTINGS_VERSION = 2;
const settingsDefaults = {
  defaultOutputRoot: "",
  defaultRebuildTop: true,
  defaultRebuildLevels: 0,
  defaultTextureCompress: false,
  defaultConvertThreads: 0,
  pythonServerUrl: "http://127.0.0.1:8787",
  resourceServerPort: 0,
  execution: {
    resourceMode: "auto"
  }
};
function migrateSettings(saved) {
  const settings = { ...settingsDefaults, ...saved, settingsVersion: SETTINGS_VERSION };
  if ((saved.settingsVersion ?? 0) < SETTINGS_VERSION && saved.defaultConvertThreads === 1) {
    settings.defaultConvertThreads = settingsDefaults.defaultConvertThreads;
  }
  return settings;
}
const desktop = {
  isTauri,
  selectInputDirectory: async () => {
    if (!isTauri()) return null;
    return tauriInvoke("select_input_directory");
  },
  selectOutputDirectory: async () => {
    if (!isTauri()) return null;
    return tauriInvoke("select_output_directory");
  },
  selectTilesetFile: async () => {
    if (!isTauri()) return null;
    return tauriInvoke("select_tileset_file");
  },
  /** Health / capabilities / scan: Tauri local commands when available (Phase 3). */
  health: async () => {
    if (isTauri()) {
      return tauriInvoke("health");
    }
    return api$1.health();
  },
  capabilities: async () => {
    if (isTauri()) {
      return tauriInvoke("capabilities");
    }
    return api$1.capabilities();
  },
  scanOsgb: async (path) => {
    if (isTauri()) {
      return tauriInvoke("scan_osgb", { path });
    }
    return api$1.scanOsgb(path);
  },
  selectModelFile: async () => {
    if (!isTauri()) return null;
    return tauriInvoke("select_model_file");
  },
  selectIfcFile: async () => {
    if (!isTauri()) return null;
    return tauriInvoke("select_ifc_file");
  },
  selectTerrainFiles: async () => {
    if (!isTauri()) return [];
    return tauriInvoke("select_terrain_files");
  },
  inspectTerrain: async (request2) => {
    if (!isTauri()) {
      throw new ApiError("terrain preflight requires Tauri desktop", 0);
    }
    return tauriInvoke("inspect_terrain_inputs", { request: request2 });
  },
  cancelTerrainInspect: async () => {
    if (!isTauri()) return;
    await tauriInvoke("cancel_terrain_inspect");
  },
  openTerrainOutput: async (taskId) => {
    if (!isTauri()) {
      throw new ApiError("openTerrainOutput requires Tauri desktop", 0);
    }
    return tauriInvoke("open_terrain_output", { taskId });
  },
  /** Artifact of a finished terrain task (registered on first use). */
  ensureTerrainArtifact: async (taskId) => {
    if (!isTauri()) {
      throw new ApiError("ensureTerrainArtifact requires Tauri desktop", 0);
    }
    const res = await tauriInvoke("ensure_terrain_artifact", { taskId });
    return res.artifact;
  },
  selectTextureRoot: async () => {
    if (!isTauri()) return null;
    return tauriInvoke("select_texture_root");
  },
  scanModel: async (path, textureRoots = []) => {
    if (!isTauri()) {
      throw new ApiError("model preflight requires Tauri desktop", 0);
    }
    return tauriInvoke("scan_model", { path, textureRoots });
  },
  listTasks: async () => {
    if (isTauri()) {
      const data = await tauriInvoke("list_tasks", {
        filter: null
      });
      return (data.tasks || []).map(normalizeTask);
    }
    return api$1.listTasks();
  },
  getTask: async (id2) => {
    if (isTauri()) {
      const data = await tauriInvoke("get_task", { taskId: id2 });
      return normalizeTask(data.task);
    }
    return api$1.getTask(id2);
  },
  createTask: async (body) => {
    if (isTauri()) {
      const input = typeof body.input === "string" ? body.input : body.input.path;
      const output = typeof body.output === "string" ? body.output : body.output.path;
      return tauriInvoke("submit_task", {
        config: {
          operation: body.operation,
          input,
          output,
          options: body.options ?? {},
          taskName: body.taskName || body.name
        }
      });
    }
    return api$1.createTask(body);
  },
  cancelTask: async (id2) => {
    if (isTauri()) {
      return tauriInvoke("cancel_task", { taskId: id2 });
    }
    return api$1.cancelTask(id2);
  },
  getTaskLogs: async (id2, tail = 500) => {
    if (isTauri()) {
      return tauriInvoke("get_task_logs", { taskId: id2, tail });
    }
    return api$1.getTaskLogs(id2, tail);
  },
  listArtifacts: async () => {
    if (isTauri()) {
      const data = await tauriInvoke("list_artifacts");
      return data.artifacts || [];
    }
    return api$1.listArtifacts();
  },
  registerArtifact: async (path, opts) => {
    if (!isTauri()) {
      throw new ApiError("registerArtifact requires Tauri desktop", 0);
    }
    return tauriInvoke("register_artifact", {
      args: {
        path,
        taskId: opts?.taskId,
        label: opts?.label,
        kind: opts?.kind
      }
    });
  },
  previewUrl: async (id2) => {
    if (isTauri()) {
      const res = await tauriInvoke("get_preview_url", { artifactId: id2 });
      return res;
    }
    return api$1.previewUrl(id2);
  },
  openArtifactDirectory: async (artifactId) => {
    if (!isTauri()) {
      throw new ApiError("openArtifactDirectory requires Tauri desktop", 0);
    }
    return tauriInvoke("open_artifact_directory", { artifactId });
  },
  getSettings: async () => {
    if (isTauri()) {
      const s2 = await tauriInvoke("get_settings");
      return migrateSettings(s2);
    }
    try {
      const raw = localStorage.getItem("geoforge.settings");
      if (!raw) return { ...settingsDefaults };
      return migrateSettings(JSON.parse(raw));
    } catch {
      return { ...settingsDefaults };
    }
  },
  updateSettings: async (settings) => {
    if (isTauri()) {
      return tauriInvoke("update_settings", { settings });
    }
    const saved = { ...settings, settingsVersion: SETTINGS_VERSION };
    localStorage.setItem("geoforge.settings", JSON.stringify(saved));
    return saved;
  },
  getResourceServerInfo: async () => {
    if (!isTauri()) return null;
    return tauriInvoke(
      "get_resource_server_info"
    );
  },
  /** Absolute API base for Settings display. */
  get baseUrl() {
    if (isTauri()) return "(Tauri commands + Rust artifact server)";
    return api$1.baseUrl;
  }
};
const api = desktop;
function useTasks(pollMs = 3e3) {
  const [tasks, setTasks] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const refresh = reactExports.useCallback(async () => {
    try {
      const data = await api.listTasks();
      setTasks(data);
      setError(null);
    } catch (e2) {
      setError(friendlyError(e2));
    } finally {
      setLoading(false);
    }
  }, []);
  reactExports.useEffect(() => {
    void refresh();
    const t2 = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(t2);
  }, [refresh, pollMs]);
  return { tasks, loading, error, refresh };
}
const SIDEBAR_KEY = "geoforge.sidebar.collapsed";
const mainNav = [
  { to: "/", label: "工具", end: true, icon: n$2 },
  { to: "/processing", label: "任务", badge: true, icon: m$2 },
  { to: "/results", label: "成果", icon: n$3 }
];
function AppLayout() {
  const { tasks } = useTasks(5e3);
  const activeCount = tasks.filter((t2) => isActiveStatus(t2.status)).length;
  const location = useLocation();
  const isPreview = location.pathname.startsWith("/preview");
  const toolPage = !["/", "/processing", "/history", "/results", "/settings"].includes(
    location.pathname
  );
  const titles = {
    "/": "工具",
    "/processing": "任务",
    "/history": "任务",
    "/results": "成果",
    "/settings": "设置",
    "/osgb/convert": "OSGB 转换",
    "/model/convert": "通用模型转换",
    "/ifc/convert": "IFC 转换",
    "/tiles/merge": "3D Tiles 合并",
    "/tiles/clip": "范围裁剪",
    "/preview/tiles": "预览与编辑",
    "/tiles/process": "3D Tiles 优化"
  };
  const processTitle = new URLSearchParams(location.search).get("op");
  const title = location.pathname === "/tiles/process" ? processTitle === "rebuild" ? "顶层重建" : processTitle === "texture" ? "纹理压缩" : "3D Tiles 优化" : titles[location.pathname] || "GeoForge 3D";
  const [collapsed, setCollapsed] = reactExports.useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "1";
    } catch {
      return false;
    }
  });
  reactExports.useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {
    }
  }, [collapsed]);
  const effectiveCollapsed = isPreview || collapsed;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "app-shell", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: `sidebar${effectiveCollapsed ? " collapsed" : ""}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "brand", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "brand-mark", "aria-hidden": true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: "/brand/geoforge-logo-v4.png", alt: "" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "brand-text", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "GeoForge 3D" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "nav", "aria-label": "主导航", children: mainNav.map((item) => {
        const Icon = item.icon;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Link,
          {
            to: item.to,
            title: item.label,
            "aria-label": item.label,
            className: `nav-item${location.pathname === item.to || item.to === "/" && toolPage ? " active" : ""}`,
            "aria-current": location.pathname === item.to || item.to === "/" && toolPage ? "page" : void 0,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "nav-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 18, weight: "regular" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "nav-label", children: item.label }),
              item.badge && activeCount > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "nav-badge", children: activeCount }) : null
            ]
          },
          item.to
        );
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sidebar-foot", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          NavLink,
          {
            to: "/settings",
            title: "设置",
            "aria-label": "设置",
            className: ({ isActive }) => `nav-item${isActive ? " active" : ""}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "nav-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(s$2, { size: 18, weight: "regular" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "nav-label", children: "设置" })
            ]
          }
        ),
        !isPreview ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            className: "nav-item",
            title: collapsed ? "展开侧栏" : "收起侧栏",
            "aria-label": collapsed ? "展开侧栏" : "收起侧栏",
            onClick: () => setCollapsed((v2) => !v2),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "nav-icon", children: collapsed ? /* @__PURE__ */ jsxRuntimeExports.jsx(s$6, { size: 18, weight: "regular" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(s$7, { size: 18, weight: "regular" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "nav-label", children: collapsed ? "展开" : "收起" })
            ]
          }
        ) : null
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "main", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "topbar", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { className: "crumbs", "aria-label": "当前位置", children: [
          toolPage ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/", children: "工具" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(s$4, { size: 12, "aria-hidden": true })
          ] }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: title })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { className: "btn btn-ghost btn-sm", to: "/settings", children: "设置与帮助" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `workspace${isPreview ? " workspace--preview" : ""}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) })
    ] })
  ] });
}
const toolGroups = [
  {
    id: "oblique",
    title: "转换",
    tools: [
      {
        id: "osgb-convert",
        title: "OSGB 转换",
        desc: "将 OSGB 数据转换为 3D Tiles",
        to: "/osgb/convert",
        icon: n$1
      },
      {
        id: "model-convert",
        title: "通用模型转换",
        desc: "将 FBX 或 OBJ 模型转换为 3D Tiles",
        to: "/model/convert",
        icon: p
      },
      {
        id: "ifc-convert",
        title: "IFC 转换",
        desc: "将 IFC 建筑模型转换为带构件属性的 3D Tiles",
        to: "/ifc/convert",
        icon: m$3
      }
    ]
  },
  {
    id: "terrain",
    title: "地形",
    tools: [
      {
        id: "terrain-tile",
        title: "地形切片",
        desc: "将 DEM 切成 Cesium quantized-mesh 地形",
        to: "/terrain/tile",
        icon: m$1
      }
    ]
  },
  {
    id: "tiles",
    title: "3D Tiles",
    tools: [
      {
        id: "tiles-merge",
        title: "3D Tiles 合并",
        desc: "将多份 Tileset 合并为统一成果",
        to: "/tiles/merge",
        icon: n$1
      },
      {
        id: "tiles-clip",
        title: "范围裁剪",
        desc: "精确保留指定地理区域内的模型",
        to: "/tiles/clip",
        icon: m
      },
      {
        id: "tiles-preview",
        title: "预览与编辑",
        desc: "浏览模型，绘制区域并裁剪或压平",
        to: "/preview/tiles",
        icon: n$4
      },
      {
        id: "tiles-rebuild",
        title: "顶层重建",
        desc: "重建 3D Tiles 的顶层结构",
        to: "/tiles/process?op=rebuild",
        icon: n$6
      },
      {
        id: "tiles-texture",
        title: "纹理压缩",
        desc: "压缩 3D Tiles 纹理以减小体积",
        to: "/tiles/process?op=texture",
        icon: I
      }
    ]
  }
];
function filterToolGroups(query) {
  const q2 = query.trim().toLowerCase();
  if (!q2) return toolGroups;
  return toolGroups.map((g) => ({
    ...g,
    tools: g.tools.filter(
      (t2) => t2.title.toLowerCase().includes(q2) || t2.desc.toLowerCase().includes(q2)
    )
  })).filter((g) => g.tools.length > 0);
}
function Workspace() {
  const [query, setQuery] = reactExports.useState("");
  const groups = reactExports.useMemo(() => filterToolGroups(query), [query]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page-header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "3D 地理数据工具" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "选择工具，开始转换、预览或处理。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "search-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "search-wrap__icon", "aria-hidden": true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(f, { size: 16 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "input",
            placeholder: "搜索工具…",
            value: query,
            onChange: (e2) => setQuery(e2.target.value),
            "aria-label": "搜索工具"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "release-note", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { children: "规则格网试用版 · 使用范围" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Windows · 连续规则网格 ≤16×16 · 保留原纹理 · 建议并发 1。暂不支持稀疏数据、任意城区和生产规模部署。" })
    ] }),
    groups.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: "未找到工具" }) : groups.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "tool-group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "tool-group__title", children: group.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tool-grid", children: group.tools.map((tool) => {
        const Icon = tool.icon;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { className: "tool-entry", to: tool.to, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tool-entry__icon", "aria-hidden": true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 20, weight: "regular" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "tool-entry__body", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: tool.title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: tool.desc })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(s$8, { className: "tool-entry__arrow", size: 18, "aria-hidden": true })
        ] }, tool.id);
      }) })
    ] }, group.id))
  ] });
}
function Drawer({ title, open, onClose, children }) {
  const dialog = reactExports.useRef(null);
  const titleId = reactExports.useId();
  reactExports.useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "dialog",
    {
      ref: dialog,
      className: "settings-drawer",
      "aria-labelledby": titleId,
      onKeyDown: (event) => {
        if (event.key !== "Tab") return;
        const controls = [
          ...event.currentTarget.querySelectorAll(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]'
          )
        ].filter((element) => element.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      },
      onCancel: (event) => {
        event.preventDefault();
        onClose();
      },
      onClick: (event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)
          onClose();
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "settings-drawer__head", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: titleId, children: title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn btn-ghost btn-sm",
              type: "button",
              "aria-label": `关闭${title}`,
              onClick: onClose,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(n, { size: 18 })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-drawer__body", children }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "settings-drawer__foot", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "field-hint", children: "参数用于当前任务" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", type: "button", onClick: onClose, children: "完成" })
        ] })
      ]
    }
  );
}
function PageHeader({
  title,
  description,
  actions
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "page-header", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: title }),
      description ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: description }) : null
    ] }),
    actions ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "page-actions", children: actions }) : null
  ] });
}
function Alert({ kind = "info", children }) {
  const cls = kind === "info" ? "alert" : `alert ${kind}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cls, children });
}
function FormSection({ title, children, description, columns }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "form-section", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-section__label", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "form-section__title", children: title }),
      description ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: description }) : null
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `form-section__body${columns ? ` form-grid cols-${columns}` : ""}`, children })
  ] });
}
function PathField({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  pickLabel = "选择目录",
  onPick,
  hint,
  error,
  feedback
}) {
  const id2 = reactExports.useId();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field path-field", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: id2, children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          id: id2,
          className: "input",
          value,
          title: value || void 0,
          placeholder,
          onChange: (e2) => onChange(e2.target.value),
          onBlur
        }
      ),
      onPick ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", type: "button", onClick: onPick, children: pickLabel }) : null
    ] }),
    feedback,
    error ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field-error", children: error }) : null,
    hint && !error ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field-hint", children: hint }) : null
  ] });
}
function SubmitBar({
  onReset,
  resetLabel = "重置",
  primaryLabel,
  onPrimary,
  primaryDisabled,
  hint
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "footer-actions", children: [
    hint ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "muted", style: { flex: 1 }, children: hint }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1 } }),
    onReset ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", type: "button", onClick: onReset, children: resetLabel }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: "btn btn-primary",
        type: "button",
        onClick: onPrimary,
        disabled: primaryDisabled,
        children: primaryLabel
      }
    )
  ] });
}
function Switch({ checked, onChange, children, id: id2, ...rest }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "switch", htmlFor: id2, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "switch__track", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          ...rest,
          id: id2,
          type: "checkbox",
          checked,
          onChange: (e2) => onChange(e2.target.checked)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("i", { "aria-hidden": true })
    ] }),
    children
  ] });
}
function convertReady(caps) {
  const c2 = caps?.convert;
  if (!c2) {
    return { ok: true, via: "unknown", message: "" };
  }
  if (c2.native || c2.exists) {
    return { ok: true, via: "bin", message: c2.message || "本机已找到转换器" };
  }
  if (c2.ready && (c2.docker || c2.dockerFallback)) {
    return {
      ok: true,
      via: "docker",
      message: c2.message || "开发环境可使用 Docker 回退（正式安装包不提供）"
    };
  }
  if (c2.docker) {
    const image = c2.image || "winner1/3dtiles:1.0";
    return {
      ok: true,
      via: "docker",
      message: `本机没有 _3dtile，转换会走 Docker（${image}）。`
    };
  }
  return {
    ok: false,
    via: "none",
    message: c2.message || "组件缺失，请修复安装（转换器）"
  };
}
function suggestOutputPath(input, defaultRoot, suffix) {
  const trimmed = input.trim().replace(/[/\\]+$/, "");
  if (!trimmed) return "";
  const parts = trimmed.split(/[/\\]/);
  const base = parts[parts.length - 1] || "output";
  const name = base.toLowerCase().endsWith(suffix.toLowerCase()) ? base : `${base}${suffix}`;
  const root = defaultRoot.trim().replace(/[/\\]+$/, "");
  if (root) {
    const sep2 = root.includes("\\") ? "\\" : "/";
    return `${root}${sep2}${name}`;
  }
  const sep = trimmed.includes("\\") ? "\\" : "/";
  const parent = parts.slice(0, -1).join(sep);
  return parent ? `${parent}${sep}${name}` : name;
}
function cloneOutputPath(path) {
  const stamp = Date.now().toString(36);
  if (!path) return `output_rerun_${stamp}`;
  if (path.endsWith("/") || path.endsWith("\\")) {
    return `${path.replace(/[/\\]$/, "")}_rerun_${stamp}`;
  }
  return `${path}_rerun_${stamp}`;
}
function pathsEqual(a2, b) {
  const norm = (p2) => p2.trim().replace(/[/\\]+$/, "").replace(/\\/g, "/").toLowerCase();
  return Boolean(a2.trim()) && norm(a2) === norm(b);
}
const STAGE_LABELS_ZH = {
  scan: "扫描",
  convert: "转换",
  merge: "合并",
  clip: "裁剪",
  flatten: "压平",
  rebuild: "顶层重建",
  "rebuild-index": "顶层重建",
  "rebuild-proxy": "顶层重建",
  texture: "纹理",
  validate: "检查",
  check: "检查",
  commit: "提交",
  done: "完成"
};
const UNIT_LABELS_ZH = {
  block: "块",
  element: "构件",
  tile: "瓦片",
  node: "节点",
  file: "文件",
  dataset: "数据集"
};
const PHASE_LABELS_ZH = {
  open: "打开",
  index: "索引",
  tessellate: "三角化",
  tiles: "分块"
};
function stageLabelZh(stage) {
  if (!stage) return "处理中";
  return STAGE_LABELS_ZH[stage] || stage;
}
function realProgressPercent(progress, status) {
  if (status === "completed" || status === "succeeded") return 100;
  if (progress && typeof progress === "object") {
    const rec = progress;
    const overall = rec.overall;
    if (typeof overall === "number" && !Number.isNaN(overall)) {
      const n2 = overall <= 1 ? overall * 100 : overall;
      return Math.max(0, Math.min(100, Math.round(n2)));
    }
    const completed = rec.completed;
    const total = rec.total;
    if (typeof completed === "number" && typeof total === "number" && total > 0) {
      return Math.max(0, Math.min(100, Math.round(completed / total * 100)));
    }
    const raw = rec.percent ?? rec.pct;
    if (typeof raw === "number" && !Number.isNaN(raw) && rec.total != null) {
      const n2 = raw <= 1 ? raw * 100 : raw;
      return Math.max(0, Math.min(100, Math.round(n2)));
    }
  }
  return null;
}
function formatTaskProgressLine(stage, progress, status) {
  const pct = realProgressPercent(progress, status);
  const prog = progress && typeof progress === "object" ? progress : void 0;
  const stageName = stageLabelZh(stage || (typeof prog?.stage === "string" ? prog.stage : void 0));
  if (status === "running" || status === "cancelling") {
    let text = stageName;
    const phase = typeof prog?.phase === "string" && prog.phase ? PHASE_LABELS_ZH[prog.phase] || prog.phase : null;
    if (phase) text = `${stageName} · ${phase}`;
    const completed = prog?.completed;
    const total = prog?.total;
    const unit = typeof prog?.unit === "string" ? UNIT_LABELS_ZH[prog.unit] || prog.unit : "";
    if (typeof completed === "number") {
      if (typeof total === "number" && total > 0) {
        text = `${text} · ${unit ? unit + " " : ""}${completed}/${total}`;
      } else {
        text = `${text} · 已完成 ${completed}${unit ? " " + unit : ""}`;
      }
    }
    if (pct != null) {
      text = `${text} · ${pct}%`;
    }
    return { text, pct };
  }
  if (status === "queued") return { text: "排队中", pct: null };
  if (status === "completed" || status === "succeeded") return { text: "已完成", pct: 100 };
  return { text: stageName, pct };
}
function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = reactExports.useState(value);
  reactExports.useEffect(() => {
    const id2 = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id2);
  }, [value, delayMs]);
  return debounced;
}
function rebuildQualityOptions(quality, ktx2Available) {
  if (quality === "quality") {
    return {
      levels: 0,
      textureMode: "keep",
      l1MaxTriangles: 8e3,
      l2MaxTriangles: 4e3
    };
  }
  if (quality === "speed") {
    return {
      levels: 0,
      textureMode: ktx2Available ? "ktx2-etc1s" : "keep",
      l1MaxTriangles: 2e3,
      l2MaxTriangles: 1e3
    };
  }
  return {
    levels: 0,
    textureMode: "keep",
    l1MaxTriangles: 4e3,
    l2MaxTriangles: 2e3
  };
}
function inferRebuildQuality(levels, textureMode) {
  if (textureMode !== "keep") return "speed";
  if (levels === 2) return "quality";
  return "balanced";
}
function rebuildLevelsLabel(levels) {
  return levels > 0 ? `顶层重建 ×${levels}` : "顶层重建到根";
}
function ktx2Etc1sEnabled(caps, forProcessTileset = false) {
  if (!caps) return false;
  if (caps.postprocessBasisu?.available) return true;
  const mode = caps.textureModes?.find((m2) => m2.mode === "ktx2-etc1s");
  if (!mode) return false;
  if (forProcessTileset && mode.processTileset) return mode.processTileset.supported !== false;
  return mode.supported === true;
}
function ktx2UastcEnabled(caps, forProcessTileset = false) {
  if (!caps) return false;
  if (caps.postprocessBasisu?.available) return true;
  const mode = caps.textureModes?.find((m2) => m2.mode === "ktx2-uastc");
  if (!mode) return false;
  if (forProcessTileset && mode.processTileset) return mode.processTileset.supported !== false;
  return mode.supported === true;
}
function textureModeEnabled(caps, mode, forProcessTileset = false) {
  if (mode === "keep") return true;
  if (mode === "ktx2-uastc") return ktx2UastcEnabled(caps, forProcessTileset);
  return ktx2Etc1sEnabled(caps, forProcessTileset);
}
const selectInputDirectory = () => desktop.selectInputDirectory();
const selectOutputDirectory = () => desktop.selectOutputDirectory();
const selectTilesetFile = () => desktop.selectTilesetFile();
const CONFIG_KEY$3 = "geoforge.osgb.convert.config";
const OUTPUT_TOUCHED_KEY$1 = "geoforge.osgb.convert.outputTouched";
const defaults$8 = {
  input: "",
  output: "",
  name: "",
  rebuildTop: true,
  quality: "balanced",
  rebuildLevels: 0,
  textureMode: "keep",
  crsOverride: "",
  originX: "",
  originY: "",
  originZ: "",
  geographicExport: false,
  convertThreads: 0
};
function loadConfig$3() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY$3);
    if (!raw) return defaults$8;
    const parsed = JSON.parse(raw);
    const next = { ...defaults$8, ...parsed };
    const savedQuality = parsed.quality;
    next.quality = savedQuality ?? inferRebuildQuality(next.rebuildLevels, next.textureMode);
    if (savedQuality) {
      next.rebuildLevels = [0, 1, 2].includes(next.rebuildLevels) ? next.rebuildLevels : 0;
    } else {
      next.rebuildLevels = 0;
    }
    if ((!next.originX || !next.originY || !next.originZ) && parsed.originOverride) {
      const parts = String(parsed.originOverride).split(/[,;\s]+/).filter(Boolean);
      if (parts.length >= 3) {
        next.originX = parts[0];
        next.originY = parts[1];
        next.originZ = parts[2];
      }
    }
    return next;
  } catch {
    return defaults$8;
  }
}
function scanSrs(scan) {
  if (!scan) return null;
  return scan.geo?.effectiveCrs || scan.summary?.srs || scan.metadata?.srs || null;
}
function scanOriginText(scan) {
  if (!scan) return null;
  return scan.geo?.effectiveOrigin?.text || scan.summary?.srsOrigin || scan.metadata?.srsOrigin || null;
}
function OsgbConvert() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = reactExports.useState(() => loadConfig$3());
  const [outputTouched, setOutputTouched] = reactExports.useState(() => {
    try {
      return localStorage.getItem(OUTPUT_TOUCHED_KEY$1) === "1";
    } catch {
      return false;
    }
  });
  const [scan, setScan] = reactExports.useState(null);
  const [scanning, setScanning] = reactExports.useState(false);
  const [scanError, setScanError] = reactExports.useState(null);
  const [detailsOpen, setDetailsOpen] = reactExports.useState(false);
  const [advancedOpen, setAdvancedOpen] = reactExports.useState(false);
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [message, setMessage] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const [caps, setCaps] = reactExports.useState(null);
  const [defaultOutputRoot, setDefaultOutputRoot] = reactExports.useState("");
  const [executionSettings, setExecutionSettings] = reactExports.useState(null);
  const scanSeq = reactExports.useRef(0);
  const debouncedInput = useDebouncedValue(form.input, 500);
  reactExports.useEffect(() => {
    void api.capabilities().then(setCaps).catch(() => setCaps(null));
    void api.getSettings().then((s2) => {
      setDefaultOutputRoot(s2.defaultOutputRoot || "");
      setExecutionSettings(s2.execution || null);
      if (s2.defaultConvertThreads !== void 0) {
        setForm((f2) => ({ ...f2, convertThreads: s2.defaultConvertThreads ?? 0 }));
      }
      if (s2.defaultTextureCompress !== void 0) {
        setForm((f2) => {
          if (s2.defaultTextureCompress) {
            const ktx2Available = ktx2Etc1sEnabled(caps, false);
            return { ...f2, textureMode: ktx2Available ? "ktx2-etc1s" : "keep" };
          } else {
            return { ...f2, textureMode: "keep" };
          }
        });
      }
    }).catch(() => {
    });
  }, [caps]);
  reactExports.useEffect(() => {
    try {
      localStorage.setItem(CONFIG_KEY$3, JSON.stringify(form));
      localStorage.setItem(OUTPUT_TOUCHED_KEY$1, outputTouched ? "1" : "0");
    } catch {
    }
  }, [form, outputTouched]);
  reactExports.useEffect(() => {
    const input = searchParams.get("input") || searchParams.get("path");
    const output = searchParams.get("output");
    const name = searchParams.get("name");
    if (!input && !output && !name) return;
    setForm((f2) => ({
      ...f2,
      ...input ? { input } : {},
      ...output ? { output } : {},
      ...name ? { name } : {}
    }));
    if (output) setOutputTouched(true);
  }, [searchParams]);
  reactExports.useEffect(() => {
    if (outputTouched) return;
    const suggested = suggestOutputPath(form.input, defaultOutputRoot, "_tiles");
    if (suggested && suggested !== form.output) {
      setForm((f2) => ({ ...f2, output: suggested }));
    }
  }, [form.input, defaultOutputRoot, outputTouched]);
  async function runScan(path) {
    const trimmed = path.trim();
    if (!trimmed) {
      setScan(null);
      setScanError(null);
      return;
    }
    const seq = ++scanSeq.current;
    setScanning(true);
    setScanError(null);
    try {
      const result = await api.scanOsgb(trimmed);
      if (seq !== scanSeq.current) return;
      setScan(result);
      if (!result.valid) {
        setScanError(result.message || (result.errors || []).join("; ") || "输入目录校验未通过。");
      } else {
        setScanError(null);
        if (result.path && result.path !== form.input) {
          setForm((f2) => ({ ...f2, input: result.path }));
        }
        if (!scanSrs(result) && form.geographicExport) {
          setAdvancedOpen(true);
        }
      }
    } catch (e2) {
      if (seq !== scanSeq.current) return;
      setScan(null);
      setScanError(friendlyError(e2));
    } finally {
      if (seq === scanSeq.current) setScanning(false);
    }
  }
  reactExports.useEffect(() => {
    void runScan(debouncedInput);
  }, [debouncedInput]);
  const effectiveCrs = reactExports.useMemo(() => {
    const override = form.crsOverride.trim();
    if (override) return override;
    return scanSrs(scan);
  }, [form.crsOverride, scan]);
  const effectiveOrigin = reactExports.useMemo(() => {
    if (form.originX.trim() && form.originY.trim() && form.originZ.trim()) {
      return `${form.originX.trim()},${form.originY.trim()},${form.originZ.trim()}`;
    }
    return scanOriginText(scan);
  }, [form.originX, form.originY, form.originZ, scan]);
  const missingCrsForGeo = form.geographicExport && !effectiveCrs;
  const convertHint = convertReady(caps);
  function update(key, value) {
    setForm((f2) => ({ ...f2, [key]: value }));
    if (key === "input") {
      setScan(null);
      setScanError(null);
    }
  }
  function handleReset() {
    setForm({ ...defaults$8 });
    setOutputTouched(false);
    setScan(null);
    setScanError(null);
    setMessage(null);
    setError(null);
    setAdvancedOpen(false);
    try {
      localStorage.removeItem(CONFIG_KEY$3);
      localStorage.removeItem(OUTPUT_TOUCHED_KEY$1);
    } catch {
    }
  }
  async function pickInputDirectory() {
    try {
      const path = await selectInputDirectory();
      if (path) update("input", path);
    } catch (error2) {
      setError(friendlyError(error2));
    }
  }
  async function pickOutputParent() {
    try {
      const parent = await selectOutputDirectory();
      if (!parent) return;
      const output = suggestOutputPath(form.input, parent, "_tiles");
      if (!output) {
        setError("请先选择输入目录，再选择输出位置。");
        return;
      }
      setOutputTouched(true);
      update("output", output);
    } catch (error2) {
      setError(friendlyError(error2));
    }
  }
  async function handleSubmit() {
    setError(null);
    setMessage(null);
    if (!form.input.trim() || !form.output.trim()) {
      setError("请填写输入目录与输出路径。");
      return;
    }
    if (pathsEqual(form.input, form.output)) {
      setError("输出目录不能与输入目录相同，请更换输出位置。");
      return;
    }
    if (missingCrsForGeo) {
      setAdvancedOpen(true);
      setError("缺少坐标信息，请补充坐标系，或关闭地理导出。");
      return;
    }
    if (scan && !scan.valid) {
      setError(scanError || "输入校验未通过，请修正后再提交。");
      return;
    }
    if (!textureModeEnabled(caps, form.textureMode)) {
      setError("当前安装包未包含可用的纹理压缩组件，请选择“保留原纹理”。");
      return;
    }
    const originValues = [form.originX, form.originY, form.originZ].map((v2) => v2.trim());
    if (originValues.some(Boolean) && originValues.some((v2) => !v2 || !Number.isFinite(Number(v2)))) {
      setError("原点 X / Y / Z 必须同时填写，且均为有限数值。");
      return;
    }
    setSubmitting(true);
    try {
      const geo = {
        geographicExport: form.geographicExport
      };
      if (form.crsOverride.trim()) geo.crs = form.crsOverride.trim();
      if (form.originX.trim() && form.originY.trim() && form.originZ.trim()) {
        geo.originX = Number(form.originX.trim());
        geo.originY = Number(form.originY.trim());
        geo.originZ = Number(form.originZ.trim());
        geo.origin = `${form.originX.trim()},${form.originY.trim()},${form.originZ.trim()}`;
      }
      const preset = rebuildQualityOptions(form.quality, ktx2Etc1sEnabled(caps));
      const executionOptions = {};
      if (executionSettings?.resourceMode === "custom") {
        if (executionSettings.cpuWorkers !== void 0) {
          executionOptions.cpuWorkers = executionSettings.cpuWorkers;
        }
        if (executionSettings.memoryBudgetMiB !== void 0) {
          executionOptions.memoryBudgetMiB = executionSettings.memoryBudgetMiB;
        }
        if (executionSettings.ioWorkers !== void 0) {
          executionOptions.ioWorkers = executionSettings.ioWorkers;
        }
      }
      const res = await api.createTask({
        operation: "convert-osgb",
        input: { path: form.input.trim() },
        output: { path: form.output.trim() },
        taskName: form.name.trim() || void 0,
        options: {
          rebuildTop: {
            enabled: form.rebuildTop,
            levels: form.rebuildLevels,
            simplify: 0.5,
            textureScale: 0.5,
            l1MaxTriangles: preset.l1MaxTriangles,
            l2MaxTriangles: preset.l2MaxTriangles
          },
          texture: { mode: form.textureMode },
          convert: {
            threads: form.convertThreads
          },
          ...Object.keys(executionOptions).length > 0 ? { execution: executionOptions } : {},
          geo,
          geographicExport: form.geographicExport
        }
      });
      const id2 = res.task?.id || res.id;
      setMessage(
        id2 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          "任务已创建 ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: `/processing?task=${encodeURIComponent(id2)}`, children: "查看任务" })
        ] }) : "任务已创建"
      );
      setOutputTouched(true);
      const nextOut = suggestOutputPath(
        form.input,
        defaultOutputRoot,
        `_tiles_${Date.now().toString(36)}`
      );
      if (nextOut) setForm((f2) => ({ ...f2, output: nextOut }));
      if (id2) navigate(`/processing?task=${encodeURIComponent(id2)}`);
    } catch (e2) {
      setError(friendlyError(e2));
    } finally {
      setSubmitting(false);
    }
  }
  const inputFeedback = scanning ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "input-feedback muted", children: "正在识别…" }) : scanError ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "input-feedback bad", children: scanError }) : scan?.valid ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "input-feedback ok", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "已识别 OSGB 数据" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-ghost btn-sm", type: "button", onClick: () => setDetailsOpen((v2) => !v2), children: detailsOpen ? "收起" : "详情" })
  ] }) : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PageHeader,
      {
        title: "OSGB 转换",
        description: "转换为 3D Tiles，保留源数据。",
        actions: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", type: "button", onClick: () => setAdvancedOpen(true), children: "高级设置" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page-form", children: [
      error ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "error", children: error }) }) : null,
      message ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "success", children: message }) }) : null,
      convertHint.via === "docker" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { kind: "warn", children: [
        convertHint.message,
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/settings", children: "打开设置" })
      ] }) }) : null,
      convertHint.via === "none" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { kind: "error", children: [
        convertHint.message,
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/settings", children: "打开设置" })
      ] }) }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormSection, { title: "数据", description: "选择要处理的源数据。", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          PathField,
          {
            label: "数据目录",
            value: form.input,
            placeholder: "含 Data/ 与 metadata.xml",
            onChange: (v2) => update("input", v2),
            onBlur: () => void runScan(form.input),
            onPick: isTauri() ? () => void pickInputDirectory() : void 0,
            feedback: inputFeedback
          }
        ),
        detailsOpen && scan ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "summary-box", style: { marginTop: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "CRS" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: effectiveCrs || "（缺失）" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "原点" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: effectiveOrigin || "（缺失）" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "瓦片" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: scan.tileCount ?? scan.summary?.tileCount ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "OSGB 文件" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: scan.summary?.osgbFileCount ?? "—" })
          ] }),
          !scanSrs(scan) && !form.crsOverride.trim() ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field-hint", style: { marginTop: 8, color: "var(--warning)" }, children: "缺少坐标信息，请补充坐标系。可继续本地转换；若需要地理定位，请在高级设置中填写 CRS。" }) : null
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormSection, { title: "处理", description: "常用参数", columns: 4, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "顶层重建" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: form.rebuildTop, onChange: (v2) => update("rebuildTop", v2), children: form.rebuildTop ? "开启" : "关闭" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "纹理处理" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              "aria-label": "纹理处理",
              className: "select",
              value: form.textureMode,
              onChange: (e2) => update("textureMode", e2.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "keep", children: "保留原纹理" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: "ktx2-etc1s", disabled: !ktx2Etc1sEnabled(caps), children: [
                  "KTX2 ETC1S",
                  ktx2Etc1sEnabled(caps) ? "（实验）" : "（不可用）"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: "ktx2", disabled: !ktx2Etc1sEnabled(caps), children: [
                  "KTX2",
                  ktx2Etc1sEnabled(caps) ? "（实验）" : "（不可用）"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: "ktx2-uastc", disabled: !ktx2UastcEnabled(caps), children: [
                  "KTX2 UASTC",
                  ktx2UastcEnabled(caps) ? "（实验）" : "（不可用）"
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field-hint", children: form.textureMode === "keep" ? "保留原始纹理，体积较大。" : form.textureMode === "ktx2-uastc" ? "UASTC 质量优先，体积介于原图与 ETC1S 之间。" : "ETC1S / KTX2 可明显减小体积，适合网络分发。" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "重建质量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              "aria-label": "重建质量",
              className: "select",
              disabled: !form.rebuildTop,
              value: form.quality,
              onChange: (e2) => {
                const quality = e2.target.value;
                const preset = rebuildQualityOptions(quality, ktx2Etc1sEnabled(caps));
                setForm((f2) => ({
                  ...f2,
                  quality,
                  rebuildLevels: preset.levels
                }));
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "quality", children: "质量优先" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "balanced", children: "均衡" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "speed", children: "性能优先" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "转换并发数" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              "aria-label": "转换并发数",
              className: "select",
              value: form.convertThreads,
              onChange: (e2) => update("convertThreads", Number(e2.target.value)),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 0, children: "自动（CPU 核心数一半，最多 8）" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 1, children: "1" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 2, children: "2" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 4, children: "4" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field-hint", children: "默认自动。转换、顶层重建和纹理压缩都按这个并发数运行；转换出错时可改为 1。" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FormSection, { title: "输出", description: "新建独立成果目录。", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        PathField,
        {
          label: "成果目录（选择父目录后自动生成）",
          value: form.output,
          onChange: (v2) => {
            setOutputTouched(true);
            update("output", v2);
          },
          onPick: isTauri() ? () => void pickOutputParent() : void 0
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Drawer, { title: "高级设置", open: advancedOpen, onClose: () => setAdvancedOpen(false), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "重建层数" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              "aria-label": "重建层数",
              className: "select",
              disabled: !form.rebuildTop,
              value: form.rebuildLevels,
              onChange: (e2) => update("rebuildLevels", Number(e2.target.value)),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 0, children: "自动到根" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 1, children: "1" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 2, children: "2" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field-hint", children: form.rebuildTop ? rebuildLevelsLabel(form.rebuildLevels) : "未启用顶层重建" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Switch,
          {
            checked: form.geographicExport,
            onChange: (v2) => {
              update("geographicExport", v2);
              if (v2 && !effectiveCrs) setAdvancedOpen(true);
            },
            children: "地理导出（要求坐标系）"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "CRS 覆盖" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field-hint", children: "当前 OSGB 转换使用 metadata.xml 中的 SRS / SRSOrigin。更改坐标系或原点请先修正该文件；不支持的覆盖会停止转换。" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              "aria-label": "CRS 覆盖",
              className: "input",
              placeholder: "例如 ENU:35.9,117.1 或 EPSG:4547",
              value: form.crsOverride,
              onChange: (e2) => update("crsOverride", e2.target.value)
            }
          ),
          !effectiveCrs ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field-error", children: "缺少坐标信息，请补充坐标系" }) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "原点覆盖 X / Y / Z" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                "aria-label": "原点覆盖 X",
                className: "input",
                placeholder: "X",
                value: form.originX,
                onChange: (e2) => update("originX", e2.target.value)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                "aria-label": "原点覆盖 Y",
                className: "input",
                placeholder: "Y",
                value: form.originY,
                onChange: (e2) => update("originY", e2.target.value)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                "aria-label": "原点覆盖 Z",
                className: "input",
                placeholder: "Z",
                value: form.originZ,
                onChange: (e2) => update("originZ", e2.target.value)
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "muted", style: { cursor: "pointer", fontSize: 13 }, children: "任务信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", style: { marginTop: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "任务名" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                "aria-label": "任务名",
                className: "input",
                placeholder: "可选，自动命名",
                value: form.name,
                onChange: (e2) => update("name", e2.target.value)
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SubmitBar,
        {
          onReset: handleReset,
          primaryLabel: submitting ? "提交中…" : "开始转换",
          onPrimary: () => void handleSubmit(),
          primaryDisabled: submitting || convertHint.via === "none"
        }
      )
    ] })
  ] });
}
function EmptyState({
  title = "暂无数据",
  description
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "empty", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600, color: "var(--text)" }, children: title }),
    description ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 4 }, children: description }) : null
  ] });
}
const defaults$7 = [
  { id: "scan", label: "扫描", status: "pending" },
  { id: "convert", label: "转换", status: "pending" },
  { id: "rebuild", label: "顶层重建", status: "pending" },
  { id: "texture", label: "纹理", status: "pending" },
  { id: "check", label: "检查", status: "pending" }
];
function statusMark(status) {
  if (status === "done") return "✓";
  if (status === "running") return "…";
  if (status === "failed") return "!";
  if (status === "skipped") return "–";
  return "";
}
function StageStepper({
  stages,
  orientation = "vertical"
}) {
  const items = stages && stages.length > 0 ? stages : defaults$7;
  if (orientation === "horizontal") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "stepper-h", role: "list", children: items.map((s2, i2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stepper-h-item", role: "listitem", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stepper-h-node", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `stepper-h-dot ${s2.status}`, children: statusMark(s2.status) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "stepper-h-label", children: s2.label })
      ] }),
      i2 < items.length - 1 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `stepper-h-line${s2.status === "done" || s2.status === "skipped" ? " done" : ""}` }) : null
    ] }, s2.id)) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "stepper", children: items.map((s2, i2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stepper-item", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stepper-rail", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `stepper-dot ${s2.status}` }),
      i2 < items.length - 1 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "stepper-line" }) : null
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600, fontSize: 13 }, children: s2.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "muted", style: { fontSize: 12 }, children: s2.message || (s2.status === "pending" ? "等待中" : s2.status === "running" ? "进行中…" : s2.status === "done" ? "已完成" : s2.status === "failed" ? "失败" : "跳过") })
    ] })
  ] }, s2.id)) });
}
const labels = {
  queued: "排队中",
  running: "运行中",
  cancelling: "取消中",
  succeeded: "已完成",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
  interrupted: "已中断"
};
const cssKey = {
  queued: "queued",
  running: "running",
  cancelling: "running",
  succeeded: "completed",
  completed: "completed",
  failed: "failed",
  cancelled: "cancelled",
  interrupted: "cancelled"
};
function StatusBadge({ status }) {
  const key = cssKey[status] || "queued";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `status-dot ${key}`, children: labels[status] ?? status });
}
const TERRAIN_OPTIONS_VERSION = 2;
const TERRAIN_MAX_SOURCES = 256;
const TERRAIN_MAX_DEPTH = 22;
const TERRAIN_MAX_SEARCH_PIXELS = 1e3;
const FILL_RANGE = [-12e3, 9e3];
const CRS_MAX_CHARS = 16 * 1024;
const DEM_EXTENSION = /\.(tif|tiff|asc|vrt)$/i;
function emptyTerrainForm() {
  return {
    sources: [],
    output: "",
    crsOverride: "",
    acceptBallpark: false,
    verticalMode: "",
    verticalAcknowledged: false,
    noDataMode: "",
    noDataValue: "",
    maxSearchPixels: "50",
    maxDepth: "",
    meshQuality: "balanced",
    projectionMode: "auto",
    overview: "auto",
    normals: false
  };
}
const normalize$1 = (path) => path.trim().replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
const directoryOf = (path) => normalize$1(path).replace(/\/[^/]+$/, "");
function addTerrainSources(current, picked) {
  const seen = new Set(current.map(normalize$1));
  const added = picked.map((path) => path.trim()).filter((path) => {
    if (!path || seen.has(normalize$1(path))) return false;
    seen.add(normalize$1(path));
    return true;
  });
  return [...current, ...added];
}
function buildTerrainOutputPath(firstSource, outputParent, outputId) {
  const fileName = firstSource.trim().split(/[/\\]/).pop() || "";
  const parent = outputParent.trim();
  if (!fileName || !parent || !outputId) return "";
  const stem = fileName.replace(DEM_EXTENSION, "");
  const separator = parent.includes("\\") ? "\\" : "/";
  return `${parent.replace(/[/\\]+$/, "")}${separator}${stem}_terrain_${outputId}`;
}
function terrainOutputPathError(sources, output) {
  const target = normalize$1(output);
  if (!target) return null;
  for (const directory of new Set(sources.map(directoryOf))) {
    if (!directory) continue;
    if (target === directory || target.startsWith(`${directory}/`)) {
      return `成果目录不能位于源文件所在目录 ${directory} 内。请选择其他保存位置。`;
    }
    if (directory.startsWith(`${target}/`)) {
      return `成果目录不能包含源文件所在目录 ${directory}。请选择其他保存位置。`;
    }
  }
  return null;
}
function terrainSourceHoles(inspection) {
  const count = inspection?.plan?.sourceHoles;
  if (!count || count.state !== "computed" || count.value === null) return void 0;
  return count.value;
}
function noDataPolicyNeeded(inspection) {
  return terrainSourceHoles(inspection) !== 0;
}
function lowAccuracyTransform(inspection) {
  return Boolean(inspection?.errors.some((error) => error.code === "TERRAIN_TRANSFORM_LOW_ACCURACY"));
}
function terrainWarnings(log) {
  const seen = /* @__PURE__ */ new Set();
  const warnings = [];
  for (const match of log.matchAll(/\[warning:(TERRAIN_[A-Z_]+)\]\s*(.*)/g)) {
    const key = `${match[1]} ${match[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    warnings.push({ code: match[1], message: match[2].trim() });
  }
  return warnings;
}
function terrainMessage(message) {
  return message.replace(/^terrain [a-z ]+:\s*/i, "");
}
function finiteNumber$2(value) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function integerIn(value, low, high) {
  const parsed = finiteNumber$2(value);
  if (parsed === null || !Number.isInteger(parsed) || parsed < low || parsed > high) return null;
  return parsed;
}
function terrainBlockers(form, inspection, inspecting) {
  const blockers = [];
  if (form.sources.length === 0) return ["请添加至少一个 DEM 文件（.tif/.tiff/.asc/.vrt）。"];
  if (form.sources.length > TERRAIN_MAX_SOURCES) blockers.push(`一次最多 ${TERRAIN_MAX_SOURCES} 个源文件。`);
  const wrong = form.sources.find((path) => !DEM_EXTENSION.test(path.trim()));
  if (wrong) blockers.push(`${wrong} 不是 DEM 文件，只支持 .tif/.tiff/.asc/.vrt。`);
  if (form.crsOverride.length > CRS_MAX_CHARS) blockers.push("指定的坐标系定义超过 16384 个字符。");
  if (inspecting) {
    blockers.push("正在检查 DEM，请等待检查完成或取消检查。");
  } else if (!inspection) {
    blockers.push("DEM 尚未检查。");
  } else if (!inspection.valid) {
    const errors = inspection.errors.length > 0 ? inspection.errors : [{ message: "DEM 检查未通过。" }];
    blockers.push(...errors.map((error) => terrainMessage(error.message)));
  }
  if (!form.output.trim()) blockers.push("请选择保存位置。");
  const outputError = terrainOutputPathError(form.sources, form.output);
  if (outputError) blockers.push(outputError);
  if (!form.verticalMode) blockers.push("请确认源高程的含义（高程基准）。");
  if (form.verticalMode && form.verticalMode !== "ellipsoidal" && !form.verticalAcknowledged) {
    blockers.push("高程将按原值写入、不做转换，请勾选确认。");
  }
  if (inspection?.valid && noDataPolicyNeeded(inspection)) {
    if (!form.noDataMode) blockers.push("源数据有 NoData 空洞（或数量未统计），请选择处理方式。");
    if (form.noDataMode === "explicit-constant") {
      const value = finiteNumber$2(form.noDataValue);
      if (value === null || value < FILL_RANGE[0] || value > FILL_RANGE[1]) {
        blockers.push("填充高程应为 -12000 至 9000 之间的数值（0 m 也是合法高程）。");
      }
    }
    if (form.noDataMode === "interpolate" && integerIn(form.maxSearchPixels, 1, TERRAIN_MAX_SEARCH_PIXELS) === null) {
      blockers.push(`插值搜索半径应为 1 至 ${TERRAIN_MAX_SEARCH_PIXELS} 的整数像元。`);
    }
  }
  if (form.maxDepth.trim() && integerIn(form.maxDepth, 0, TERRAIN_MAX_DEPTH) === null) {
    blockers.push(`最大层级应为 0 至 ${TERRAIN_MAX_DEPTH} 的整数，留空为自动。`);
  }
  return blockers;
}
function noDataPolicy(form, inspection) {
  if (!noDataPolicyNeeded(inspection)) return { mode: "none-required" };
  if (form.noDataMode === "explicit-constant") return { mode: "explicit-constant", valueMeters: Number(form.noDataValue) };
  if (form.noDataMode === "interpolate") return { mode: "interpolate", maxSearchPixels: Number(form.maxSearchPixels) };
  return { mode: "unresolved" };
}
function buildTerrainTaskOptions(form, inspection, execution) {
  const preprocess = {};
  if (form.projectionMode !== "auto") preprocess.projectionMode = form.projectionMode;
  if (form.overview === "off") preprocess.overview = "off";
  if (form.acceptBallpark) preprocess.acceptBallparkTransform = true;
  const terrain = {
    version: TERRAIN_OPTIONS_VERSION,
    sources: form.sources.map((path) => path.trim()),
    verticalDatum: { mode: form.verticalMode, acknowledged: form.verticalAcknowledged },
    noData: noDataPolicy(form, inspection),
    preprocess,
    tiling: {
      maxDepth: form.maxDepth.trim() ? Number(form.maxDepth) : "auto",
      meshQuality: form.meshQuality,
      normals: form.normals
    }
  };
  if (form.crsOverride.trim()) terrain.crsOverride = form.crsOverride.trim();
  const options = { terrain };
  if (execution?.resourceMode === "custom") {
    const custom = Object.fromEntries(
      ["cpuWorkers", "memoryBudgetMiB", "ioWorkers"].filter((key) => execution[key] !== void 0).map((key) => [key, execution[key]])
    );
    if (Object.keys(custom).length > 0) options.execution = custom;
  }
  return options;
}
function describeCrs(crs) {
  if (!crs) return "未知";
  const name = crs.name || "未命名坐标系";
  const parts = [crs.authority ? `${name}（${crs.authority}）` : name];
  if (crs.linearUnit?.name) parts.push(`单位 ${crs.linearUnit.name}`);
  return parts.join(" · ");
}
function describeVertical(name) {
  return name ? name : "未知（源文件未声明垂直基准）";
}
function describeNoData(source) {
  const declared = source.noData?.declared;
  if (declared === null || declared === void 0) return "未声明 NoData";
  const holes = source.noData?.sourceHoles;
  const count = holes?.state === "computed" && holes.value !== null ? `${holes.value.toLocaleString("zh-CN")} 个空洞像元` : "空洞数未统计";
  return `NoData = ${declared} · ${count}`;
}
function describeBounds(bounds) {
  if (!bounds) return "—";
  const [west, south, east, north] = bounds;
  return `经度 ${west.toFixed(4)}～${east.toFixed(4)}，纬度 ${south.toFixed(4)}～${north.toFixed(4)}`;
}
function describePixel(source) {
  if (!source.pixelSize || !source.dimensions) return "—";
  const unit = source.crs?.linearUnit?.name === "metre" ? " m" : source.crs?.type === "geographic" ? "°" : "";
  const [x2, y2] = source.pixelSize;
  return `${source.dimensions[0]} × ${source.dimensions[1]} 像元，像元 ${Number(x2.toPrecision(6))}${unit} × ${Number(y2.toPrecision(6))}${unit}`;
}
const ROUTE_REASONS = {
  "auto-normalizes": "自动：先重投影到 WGS 84 经纬度",
  "normalize-requested": "指定先重投影到 WGS 84",
  "heterogeneous-sources": "多个源坐标系或像元不同，逐个重投影后合并",
  "source-is-wgs84-geographic": "源已是 WGS 84 经纬度",
  "compound-crs": "复合坐标系，保证高程不被改动",
  "geographic-not-wgs84": "源是非 WGS 84 的经纬度",
  "no-operation": "没有可用的坐标变换",
  "grid-based-datum-shift": "基准转换依赖格网",
  "validated-projection-method": "投影方法已通过直接切片验证",
  "projection-method-not-validated-for-direct": "投影方法未验证直接切片，改为先重投影"
};
function describeRoute(route, reason) {
  const label = route === "direct" ? "直接切片" : "先重投影";
  return `${label}（${ROUTE_REASONS[reason] || reason}）`;
}
const statusFilter = {
  all: () => true,
  active: (t2) => t2.status === "running" || t2.status === "queued" || t2.status === "cancelling",
  done: (t2) => t2.status === "completed" || t2.status === "succeeded",
  failed: (t2) => t2.status === "failed" || t2.status === "cancelled" || t2.status === "interrupted"
};
function opLabel(op) {
  if (op === "clip-tileset") return "范围裁剪";
  if (op === "flatten-tileset") return "区域压平";
  if (op === "merge-tilesets") return "3D Tiles 合并";
  if (op === "convert-osgb") return "OSGB 转换";
  if (op === "convert-model") return "通用模型转换";
  if (op === "convert-ifc") return "IFC 转换";
  if (op === "convert-terrain") return "地形切片";
  if (op === "process-tileset") return "Tiles 处理";
  return op || "—";
}
function TaskIcon({ operation }) {
  if (operation === "convert-osgb") return /* @__PURE__ */ jsxRuntimeExports.jsx(n$1, { size: 18 });
  if (operation === "convert-model") return /* @__PURE__ */ jsxRuntimeExports.jsx(n$6, { size: 18 });
  if (operation === "convert-ifc") return /* @__PURE__ */ jsxRuntimeExports.jsx(m$3, { size: 18 });
  if (operation === "convert-terrain") return /* @__PURE__ */ jsxRuntimeExports.jsx(m$1, { size: 18 });
  if (operation === "process-tileset") return /* @__PURE__ */ jsxRuntimeExports.jsx(n$6, { size: 18 });
  if (operation === "merge-tilesets") return /* @__PURE__ */ jsxRuntimeExports.jsx(n$1, { size: 18 });
  if (operation === "clip-tileset") return /* @__PURE__ */ jsxRuntimeExports.jsx(m, { size: 18 });
  if (operation === "flatten-tileset") return /* @__PURE__ */ jsxRuntimeExports.jsx(m, { size: 18 });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(I, { size: 18 });
}
function fmtTime$1(v2) {
  if (v2 == null || v2 === "") return "—";
  const d = typeof v2 === "number" ? new Date(v2 * (v2 < 1e12 ? 1e3 : 1)) : new Date(v2);
  if (Number.isNaN(d.getTime())) return String(v2);
  return d.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
}
function statusLine(t2) {
  if (t2.status === "failed") {
    const reason = t2.error || t2.message;
    return { text: reason ? `失败 · ${reason}` : "失败", pct: null };
  }
  if (t2.status === "cancelled") return { text: "已取消", pct: null };
  if (t2.status === "interrupted") return { text: "已中断", pct: null };
  if (t2.status === "queued") return { text: "排队中", pct: null };
  if (t2.status === "completed" || t2.status === "succeeded") return { text: "已完成", pct: 100 };
  return formatTaskProgressLine(t2.stage, t2.progress, t2.status);
}
function StatusIcon({ status }) {
  if (status === "running" || status === "cancelling") return /* @__PURE__ */ jsxRuntimeExports.jsx(n$7, { size: 16 });
  if (status === "queued") return /* @__PURE__ */ jsxRuntimeExports.jsx(n$7, { size: 16 });
  if (status === "completed" || status === "succeeded")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(s$3, { size: 16, color: "var(--success)" });
  if (status === "failed" || status === "cancelled" || status === "interrupted") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(s, { size: 16, color: "var(--danger)" });
  }
  return null;
}
function rebuildHref(t2) {
  if (t2.operation === "flatten-tileset") {
    const preview = t2.options?.preview;
    const params2 = new URLSearchParams({ operation: "flatten" });
    if (preview?.sourceArtifactId) params2.set("artifact", preview.sourceArtifactId);
    return `/preview/tiles?${params2}`;
  }
  const params = new URLSearchParams();
  if (t2.input) params.set("input", t2.input);
  if (t2.output) params.set("output", cloneOutputPath(t2.output));
  if (t2.name) params.set("name", t2.name);
  const q2 = params.toString();
  if (t2.operation === "merge-tilesets") {
    const merge = t2.options?.merge;
    for (const input of merge?.additionalInputs || []) params.append("input", input);
    return `/tiles/merge?${params}`;
  }
  if (t2.operation === "clip-tileset") {
    const clip = t2.options?.clip;
    if (clip?.region) params.set("region", JSON.stringify(clip.region));
    return `/tiles/clip?${params}`;
  }
  if (t2.operation === "process-tileset") return `/tiles/process?${q2}`;
  if (t2.operation === "convert-model") return `/model/convert?${q2}`;
  if (t2.operation === "convert-ifc") return `/ifc/convert?${q2}`;
  if (t2.operation === "convert-terrain") {
    const terrain = t2.options?.terrain;
    const sources = new URLSearchParams();
    for (const source of terrain?.sources || []) sources.append("input", source);
    return `/terrain/tile?${sources}`;
  }
  return `/osgb/convert?${q2}`;
}
function joinPath(directory, file) {
  const separator = directory.includes("\\") ? "\\" : "/";
  return `${directory.replace(/[/\\]+$/, "")}${separator}${file}`;
}
function diagnosticPaths(t2) {
  if (!t2.progress || typeof t2.progress !== "object") return [];
  const progress = t2.progress;
  return ["stderrLogPath", "stdoutLogPath"].map((key) => progress[key]).filter((value) => typeof value === "string" && value.length > 0);
}
function progressText(t2, key) {
  if (!t2.progress || typeof t2.progress !== "object") return null;
  const value = t2.progress[key];
  return typeof value === "string" && value.trim() ? value : null;
}
function failureSuggestion(code) {
  if (!code) return null;
  if (code === "PATH_OUTPUT_EXISTS") return "请更换一个尚不存在的成果目录。";
  if (code === "PATH_OUTPUT_NOT_WRITABLE") return "请检查输出目录权限，或选择可写磁盘。";
  if (code === "CONVERTER_EXIT_NONZERO")
    return "查看 stderr 诊断文件，确认输入数据和 converter 依赖。";
  if (code === "TERRAIN_RUNTIME_MISSING") return "地形组件缺失，请修复安装后重试。";
  if (code === "TERRAIN_NODATA_POLICY_REQUIRED") return "源数据有 NoData 空洞，请在地形切片页选择插值或固定高程后重新提交。";
  if (code === "TERRAIN_NODATA_FILL_FAILED") return "有空洞离有效数据太远，请加大插值搜索半径或改用固定高程。";
  if (code === "TERRAIN_TRANSFORM_LOW_ACCURACY") return "该坐标系到 WGS 84 只有精度未知的变换；确认可接受后在页面中勾选再提交。";
  if (code === "TERRAIN_CRS_MISSING") return "源文件没有坐标系，请在地形切片页指定源坐标系。";
  if (code === "TERRAIN_INPUT_MIXED_DATUM") return "多个源文件的坐标基准不同，请分开切片或先统一基准。";
  if (code === "TASK_CANCELLED") return "任务已取消；原始输入和既有成果应保持不变。";
  return "请查看完整日志和诊断文件，再决定是否重试。";
}
function Processing() {
  const { tasks, loading, error, refresh } = useTasks(2e3);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = reactExports.useState("all");
  const [typeFilter, setTypeFilter] = reactExports.useState("all");
  const [selectedId, setSelectedId] = reactExports.useState(searchParams.get("task"));
  const [actionError, setActionError] = reactExports.useState(null);
  const [cancellingId, setCancellingId] = reactExports.useState(null);
  const [logText, setLogText] = reactExports.useState("");
  const [logOpen, setLogOpen] = reactExports.useState(false);
  const [query, setQuery] = reactExports.useState("");
  reactExports.useEffect(() => {
    const id2 = searchParams.get("task");
    if (id2) setSelectedId(id2);
  }, [searchParams]);
  const filtered = reactExports.useMemo(() => {
    let list = tasks.filter(statusFilter[tab]);
    if (typeFilter !== "all") {
      list = list.filter((t2) => t2.operation === typeFilter);
    }
    const q2 = query.trim().toLowerCase();
    if (q2) {
      list = list.filter(
        (t2) => (t2.name || "").toLowerCase().includes(q2) || (t2.operation || "").toLowerCase().includes(q2) || (t2.input || "").toLowerCase().includes(q2)
      );
    }
    return list;
  }, [tasks, tab, typeFilter, query]);
  const selected = selectedId ? tasks.find((t2) => t2.id === selectedId) || null : null;
  const selectedErrorCode = selected ? progressText(selected, "errorCode") : null;
  const selectedFailedStage = selected ? progressText(selected, "failedStage") : null;
  const selectedSuggestion = failureSuggestion(selectedErrorCode);
  reactExports.useEffect(() => {
    if (!selected) {
      setLogText("");
      return;
    }
    if (selected.log) {
      setLogText(selected.log);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.getTaskLogs(selected.id);
        if (!cancelled) setLogText(data.log || (data.lines || []).join("\n"));
      } catch {
        if (!cancelled) setLogText("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?.id, selected?.log, selected?.updatedAt]);
  async function previewTerrain(id2) {
    setActionError(null);
    try {
      const artifact = await api.ensureTerrainArtifact(id2);
      navigate(`/preview/terrain?artifact=${encodeURIComponent(artifact.id)}`);
    } catch (reason) {
      setActionError(friendlyError(reason));
    }
  }
  async function openTerrain(id2) {
    setActionError(null);
    try {
      await api.openTerrainOutput(id2);
    } catch (reason) {
      setActionError(friendlyError(reason));
    }
  }
  async function cancel(id2) {
    setActionError(null);
    setCancellingId(id2);
    try {
      await api.cancelTask(id2);
      await refresh();
    } catch (e2) {
      setActionError(friendlyError(e2));
    } finally {
      setCancellingId(null);
    }
  }
  function selectTask(id2) {
    setSelectedId(id2);
    setLogOpen(false);
    if (id2) {
      setSearchParams({ task: id2 }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }
  function rowActions(t2) {
    if (isActiveStatus(t2.status)) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn btn-sm",
          type: "button",
          disabled: cancellingId === t2.id || t2.status === "cancelling",
          onClick: (e2) => {
            e2.stopPropagation();
            void cancel(t2.id);
          },
          children: t2.status === "cancelling" || cancellingId === t2.id ? "取消中…" : "取消"
        }
      );
    }
    if (t2.status === "completed" || t2.status === "succeeded") {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row wrap", style: { gap: 6 }, onClick: (e2) => e2.stopPropagation(), children: [
        (t2.artifactId || t2.output) && t2.operation !== "convert-terrain" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { className: "btn btn-sm", to: "/results", children: "查看成果" }) : null,
        t2.operation === "convert-terrain" && t2.status === "succeeded" ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm", type: "button", onClick: () => void previewTerrain(t2.id), children: "预览地形" }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm", type: "button", onClick: () => navigate(rebuildHref(t2)), children: "重新处理" })
      ] });
    }
    if (t2.status === "failed" || t2.status === "cancelled" || t2.status === "interrupted") {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row wrap", style: { gap: 6 }, onClick: (e2) => e2.stopPropagation(), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm", type: "button", onClick: () => selectTask(t2.id), children: "查看详情" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm", type: "button", onClick: () => navigate(rebuildHref(t2)), children: "重新处理" })
      ] });
    }
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page", style: { display: "flex", flexDirection: "column" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page-header full-width", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "任务" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "查看进度、取消任务或重新处理。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "search-wrap", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "input",
          placeholder: "搜索任务…",
          value: query,
          onChange: (e2) => setQuery(e2.target.value),
          "aria-label": "搜索任务",
          style: { paddingLeft: 10 }
        }
      ) })
    ] }),
    error ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "warn", children: error }) }) : null,
    actionError ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "error", children: actionError }) }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "filter-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "filter-row__label", children: "状态" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tabs", children: [
        ["all", "全部"],
        ["active", "进行中"],
        ["done", "已完成"],
        ["failed", "失败"]
      ].map(([id2, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          "aria-pressed": tab === id2,
          className: `tab${tab === id2 ? " active" : ""}`,
          onClick: () => setTab(id2),
          children: label
        },
        id2
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "filter-row__label", children: "类型" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "select",
        {
          className: "select",
          "aria-label": "任务类型",
          style: { width: 160 },
          value: typeFilter,
          onChange: (e2) => setTypeFilter(e2.target.value),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "全部" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "convert-osgb", children: "OSGB 转换" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "convert-model", children: "通用模型转换" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "convert-ifc", children: "IFC 转换" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "convert-terrain", children: "地形切片" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "process-tileset", children: "Tiles 处理" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "merge-tilesets", children: "3D Tiles 合并" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "clip-tileset", children: "范围裁剪" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "flatten-tileset", children: "区域压平" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "split-drawer", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "split-drawer__list", children: loading && tasks.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "muted", children: "加载中…" }) : filtered.length === 0 ? tasks.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { title: "还没有任务", description: "选择一个工具开始处理。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 12, textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { className: "btn btn-primary", to: "/", children: "选择工具" }) })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: "没有符合筛选条件的任务。" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "task-table-wrap", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "名称" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "类型" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "状态" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "时间" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "操作" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: filtered.map((t2) => {
          const line = statusLine(t2);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "tr",
            {
              onClick: () => selectTask(t2.id),
              style: {
                cursor: "pointer",
                background: selected?.id === t2.id ? "var(--surface-selected)" : void 0
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "task-name", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "task-name__icon", "aria-hidden": true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TaskIcon, { operation: t2.operation }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      title: t2.name || t2.id,
                      "aria-expanded": selected?.id === t2.id,
                      onClick: (event) => {
                        event.stopPropagation();
                        selectTask(t2.id);
                      },
                      children: t2.name || t2.operation || t2.id
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "muted", children: opLabel(t2.operation) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "task-status-cell", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "row", style: { gap: 6 }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(StatusIcon, { status: t2.status }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: line.text })
                  ] }),
                  (t2.status === "running" || t2.status === "cancelling") && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      className: `progress-bar${line.pct == null ? " indeterminate" : ""}`,
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx("i", { style: { width: `${line.pct ?? 40}%` } })
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "muted", children: fmtTime$1(t2.updatedAt || t2.createdAt) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: rowActions(t2) })
              ]
            },
            t2.id
          );
        }) })
      ] }) }) }),
      selected ? /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "split-drawer__panel", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "drawer-head", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: selected.name || selected.operation || selected.id }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 6 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: selected.status }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn btn-ghost btn-sm",
              type: "button",
              onClick: () => selectTask(null),
              children: "关闭"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "section-title", children: "处理阶段" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StageStepper, { stages: selected.stages, orientation: "horizontal" }),
        isActiveStatus(selected.status) && typeof selected.progress === "object" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "summary-box",
            style: { marginTop: 16, marginBottom: 16, background: "var(--surface-hover)" },
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { children: [
              selected.progress.completed !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "进度" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { children: [
                  selected.progress.completed,
                  selected.progress.total !== void 0 && selected.progress.total > 0 ? ` / ${selected.progress.total}` : " 个单元"
                ] })
              ] }),
              selected.progress.parallelism !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "并行数" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { children: [
                  selected.progress.parallelism,
                  " worker(s)"
                ] })
              ] }),
              selected.progress.resourceWait && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "状态" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(c, { size: 14 }),
                  "等待资源"
                ] }) })
              ] })
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "summary-box", style: { marginTop: 16, marginBottom: 16 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "操作" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: opLabel(selected.operation) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "阶段" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: selected.stage || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "输入" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: selected.input || "—" }),
          selected.operation === "clip-tileset" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "保留区域" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { children: JSON.stringify(
              selected.options?.clip?.region,
              null,
              2
            ) }) })
          ] }),
          selected.operation === "flatten-tileset" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "压平区域与高度" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { children: JSON.stringify(selected.options?.flatten, null, 2) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "重新设置" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: "重新创建会打开源模型预览，请重新绘制区域并拖动目标平面。" })
          ] }),
          selected.operation === "merge-tilesets" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "其他输入" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: (selected.options?.merge?.additionalInputs || []).map((path, index2) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: path }, index2)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "输出" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: selected.artifactPath || selected.output || "—" }),
          selected.operation === "convert-terrain" && (selected.status === "succeeded" || selected.status === "completed") ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "地形成果" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { children: [
              ["layer.json", "geoforge-terrain.json"].map((file) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { wordBreak: "break-all" }, children: joinPath(progressText(selected, "path") || selected.output || "", file) }, file)),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row wrap", style: { gap: 6, marginTop: 6 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm btn-primary", type: "button", onClick: () => void previewTerrain(selected.id), children: "预览地形" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm", type: "button", onClick: () => void openTerrain(selected.id), children: "打开文件夹" })
              ] })
            ] })
          ] }) : null,
          selected.operation === "convert-terrain" && terrainWarnings(logText || selected.log || "").length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "质量警告" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: terrainWarnings(logText || selected.log || "").map((warning2) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { kind: "warn", children: [
              warning2.message,
              "（",
              warning2.code,
              "）"
            ] }, warning2.code + warning2.message)) })
          ] }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "说明" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: selected.message || selected.error || "—" }),
          selectedErrorCode ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "错误代码" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: selectedErrorCode })
          ] }) : null,
          selectedFailedStage ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "失败阶段" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: selectedFailedStage })
          ] }) : null,
          selectedSuggestion && selected.status !== "succeeded" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "建议" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: selectedSuggestion })
          ] }) : null,
          diagnosticPaths(selected).length ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "诊断日志" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: diagnosticPaths(selected).map((path) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { wordBreak: "break-all" }, children: path }, path)) })
          ] }) : null
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "details",
          {
            open: logOpen,
            onToggle: (e2) => setLogOpen(e2.target.open),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "muted", style: { cursor: "pointer" }, children: "执行日志" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "log-pre", children: logText || selected.log || "（暂无日志）" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "actions", children: [
          isActiveStatus(selected.status) ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn btn-danger",
              type: "button",
              disabled: cancellingId === selected.id || selected.status === "cancelling",
              onClick: () => void cancel(selected.id),
              children: selected.status === "cancelling" || cancellingId === selected.id ? "取消中…" : "取消任务"
            }
          ) : null,
          (selected.status === "failed" || selected.status === "cancelled" || selected.status === "interrupted") && typeof selected.progress === "object" && selected.progress.completed !== void 0 && selected.progress.completed > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              className: "btn",
              type: "button",
              onClick: () => navigate(rebuildHref(selected)),
              title: "从断点恢复处理",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(m$4, { size: 16, style: { marginRight: 4 } }),
                "恢复处理"
              ]
            }
          ) : null,
          isDoneStatus(selected.status) ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn",
              type: "button",
              onClick: () => navigate(rebuildHref(selected)),
              children: "重新处理"
            }
          ) : null
        ] })
      ] }) : null
    ] })
  ] });
}
function clippingRegion(form) {
  if (form.mode === "polygon") {
    const region = JSON.parse(form.geojson);
    const geometry = region?.type === "Feature" ? region.geometry : region;
    if (geometry?.type !== "Polygon" || !Array.isArray(geometry.coordinates) || geometry.coordinates.length !== 1) throw new Error("请输入不含孔洞的 GeoJSON Polygon 或 Feature。");
    return region;
  }
  if (form.bounds.length !== 4 || form.bounds.some((v2) => !v2.trim())) throw new Error("请填写完整的经纬度范围。");
  const [west, south, east, north] = form.bounds.map(Number);
  if (![west, south, east, north].every(Number.isFinite) || west >= east || south >= north) throw new Error("范围应满足西经度 < 东经度，南纬度 < 北纬度。");
  if (Math.abs(west) > 180 || Math.abs(east) > 180 || Math.abs(south) > 80 || Math.abs(north) > 80) throw new Error("经度应在 ±180° 内，首版纬度应在 ±80° 内。");
  return { type: "rectangle", bounds: [west, south, east, north] };
}
function clipTaskRequest(form) {
  if (!form.input.trim()) throw new Error("请填写 Tileset 路径。");
  if (!form.output.trim()) throw new Error("请填写成果目录。");
  const normalized = (p2) => p2.trim().replace(/\\/g, "/").replace(/\/+$/, "").replace(/\/[^/]+\.json$/i, "").toLowerCase();
  const input = normalized(form.input);
  const output = normalized(form.output);
  if (input === output || input.startsWith(`${output}/`) || output.startsWith(`${input}/`)) throw new Error("成果目录不能与输入目录重叠。");
  return {
    operation: "clip-tileset",
    input: { path: form.input.trim() },
    output: { path: form.output.trim() },
    taskName: form.name.trim() || void 0,
    options: { clip: { region: clippingRegion(form) } }
  };
}
function restoreClipRegion(region) {
  const value = region;
  if (value?.type === "rectangle" && Array.isArray(value.bounds) && value.bounds.length === 4) return { mode: "rectangle", bounds: value.bounds.map(String), geojson: "" };
  return { mode: "polygon", bounds: ["", "", "", ""], geojson: JSON.stringify(region, null, 2) };
}
function drawnClipRegion(mode, points) {
  if (mode === "rectangle" && points.length !== 2 || points.length < (mode === "rectangle" ? 2 : 3) || points.length > 256) throw new Error("请完成区域绘制；多边形需要 3 到 256 个顶点。");
  if (points.some((p2) => p2.length !== 2 || !p2.every(Number.isFinite) || Math.abs(p2[0]) > 180 || Math.abs(p2[1]) > 80)) throw new Error("区域经度须在 ±180°、纬度须在 ±80° 内。");
  const ring = mode === "rectangle" ? rectangleRing(points) : points;
  const lon = ring.reduce((sum, p2) => sum + p2[0], 0) / ring.length;
  const lat = ring.reduce((sum, p2) => sum + p2[1], 0) / ring.length;
  if (ring.some((p2) => Math.abs(p2[0] - lon) > 1)) throw new Error("区域跨度过大或跨日期变更线。");
  const radians = Math.PI / 180;
  const sl2 = Math.sin(lon * radians), cl2 = Math.cos(lon * radians), s2 = Math.sin(lat * radians), c2 = Math.cos(lat * radians);
  const surface = ([x2, y2]) => {
    const sy = Math.sin(y2 * radians), cy = Math.cos(y2 * radians);
    const n2 = 6378137 / Math.sqrt(1 - 0.0066943799901413165 * sy * sy);
    return [n2 * cy * Math.cos(x2 * radians), n2 * cy * Math.sin(x2 * radians), n2 * (1 - 0.0066943799901413165) * sy];
  };
  const origin = surface([lon, lat]);
  const planar = ring.map((p2) => {
    const delta = surface(p2).map((v2, i2) => v2 - origin[i2]);
    return [-sl2 * delta[0] + cl2 * delta[1], -s2 * cl2 * delta[0] - s2 * sl2 * delta[1] + c2 * delta[2]];
  });
  if (planar.some(([x2, y2]) => Math.hypot(x2, y2) > 1e4)) throw new Error("区域距中心不能超过 10 公里。");
  const area = planar.reduce((sum, p2, i2) => {
    const next = planar[(i2 + 1) % planar.length];
    return sum + p2[0] * next[1] - next[0] * p2[1];
  }, 0);
  if (Math.abs(area) < 1e-4) throw new Error("区域面积为零，请重新绘制。");
  const cross = (a2, b, p2) => (b[0] - a2[0]) * (p2[1] - a2[1]) - (b[1] - a2[1]) * (p2[0] - a2[0]);
  const onSegment = (a2, b, p2) => Math.abs(cross(a2, b, p2)) <= 1e-6 && [0, 1].every((i2) => p2[i2] >= Math.min(a2[i2], b[i2]) - 1e-6 && p2[i2] <= Math.max(a2[i2], b[i2]) + 1e-6);
  if (planar.some((a2, i2) => planar.slice(i2 + 1).some((b) => Math.hypot(b[0] - a2[0], b[1] - a2[1]) < 1e-6))) throw new Error("区域存在重复顶点。");
  for (let i2 = 0; i2 < planar.length; i2++) {
    const a2 = planar[i2], b = planar[(i2 + 1) % planar.length];
    if (Math.hypot(b[0] - a2[0], b[1] - a2[1]) < 1e-6) throw new Error("区域存在重复顶点。");
    for (let j = i2 + 1; j < planar.length; j++) {
      const c22 = planar[j], d = planar[(j + 1) % planar.length];
      if (Math.hypot(c22[0] - a2[0], c22[1] - a2[1]) < 1e-6) throw new Error("区域存在重复顶点。");
      if (j === i2 + 1 || i2 === 0 && j === planar.length - 1) continue;
      if (cross(a2, b, c22) * cross(a2, b, d) < 0 && cross(c22, d, a2) * cross(c22, d, b) < 0 || onSegment(a2, b, c22) || onSegment(a2, b, d) || onSegment(c22, d, a2) || onSegment(c22, d, b)) throw new Error("多边形不能自交或自接触，请调整顶点。");
    }
  }
  return mode === "rectangle" ? { type: "rectangle", bounds: [ring[0][0], ring[0][1], ring[2][0], ring[2][1]] } : { type: "Polygon", coordinates: [[...points, points[0]]] };
}
function rectangleRing(points) {
  const [a2, b] = points;
  const west = Math.min(a2[0], b[0]), east = Math.max(a2[0], b[0]);
  const south = Math.min(a2[1], b[1]), north = Math.max(a2[1], b[1]);
  return [[west, south], [east, south], [east, north], [west, north]];
}
function readDrawingMessage(value) {
  if (!value || typeof value !== "object") return null;
  const data = value;
  if (data.type !== "geoforge-region" || !["rectangle", "polygon"].includes(String(data.mode)) || typeof data.complete !== "boolean" || typeof data.active !== "boolean" || !Array.isArray(data.points) || data.points.length > 256) return null;
  if (!data.points.every((p2) => Array.isArray(p2) && p2.length === 2 && p2.every((n2) => typeof n2 === "number" && Number.isFinite(n2)))) return null;
  if (data.heights !== void 0 && (!Array.isArray(data.heights) || data.heights.length !== data.points.length || !data.heights.every((h) => typeof h === "number" && Number.isFinite(h)))) return null;
  return { mode: data.mode, points: data.points, heights: data.heights, complete: data.complete, active: data.active };
}
function readFlattenMessage(value) {
  if (!value || typeof value !== "object") return null;
  const data = value;
  if (data.type !== "geoforge-flatten-plane" || typeof data.regionKey !== "string" || typeof data.hasUndo !== "boolean" || ![data.heightMeters, data.initialHeightMeters].every((h) => typeof h === "number" && Number.isFinite(h) && Math.abs(h) <= 1e4)) return null;
  return data;
}
function PreviewClipPanel({ input, name, frame, onResult, onClose, operation = "clip", sourceArtifactId }) {
  const flatten = operation === "flatten";
  const title = flatten ? "区域压平" : "范围裁剪";
  const [mode, setMode] = reactExports.useState("rectangle");
  const [drawing, setDrawing] = reactExports.useState(null);
  const [output, setOutput] = reactExports.useState(() => suggestOutputPath(input.replace(/[/\\][^/\\]+\.json$/i, ""), "", `_${flatten ? "flattened" : "clipped"}_${Date.now().toString(36)}`));
  const [plane, setPlane] = reactExports.useState(null);
  const regionKey = reactExports.useRef("");
  const [error, setError] = reactExports.useState("");
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [task, setTask] = reactExports.useState(null);
  const [result, setResult] = reactExports.useState(null);
  const busy = submitting || Boolean(task && !["succeeded", "completed", "failed", "cancelled", "interrupted"].includes(task.status));
  let region = null, regionError = "";
  try {
    if (drawing?.complete) region = drawnClipRegion(drawing.mode, drawing.points);
  } catch (e2) {
    regionError = friendlyError(e2);
  }
  function command(action, drawMode = mode) {
    frame.current?.contentWindow?.postMessage({ type: "geoforge-draw", action, mode: drawMode }, window.location.origin);
  }
  function planeCommand(action) {
    frame.current?.contentWindow?.postMessage({
      type: "geoforge-flatten",
      action,
      region,
      regionKey: JSON.stringify(region),
      samples: drawing?.points.map((p2, i2) => [...p2, drawing.heights?.[i2] || 0])
    }, window.location.origin);
  }
  reactExports.useEffect(() => {
    function receive(ev) {
      if (ev.source !== frame.current?.contentWindow || ev.origin !== window.location.origin) return;
      const value = readDrawingMessage(ev.data);
      if (value) {
        let key = "";
        try {
          if (value.complete) key = JSON.stringify(drawnClipRegion(value.mode, value.points));
        } catch {
        }
        if (key !== regionKey.current) {
          regionKey.current = key;
          setPlane(null);
          frame.current?.contentWindow?.postMessage({ type: "geoforge-flatten", action: "clear" }, window.location.origin);
        }
        setDrawing(value);
        setError("");
      }
      const telemetry = readFlattenMessage(ev.data);
      if (telemetry && telemetry.regionKey === regionKey.current) setPlane(telemetry);
    }
    window.addEventListener("message", receive);
    return () => {
      window.removeEventListener("message", receive);
      frame.current?.contentWindow?.postMessage({ type: "geoforge-draw", action: "clear" }, window.location.origin);
      frame.current?.contentWindow?.postMessage({ type: "geoforge-draw", action: "stop" }, window.location.origin);
      frame.current?.contentWindow?.postMessage({ type: "geoforge-flatten", action: "clear" }, window.location.origin);
    };
  }, [frame]);
  reactExports.useEffect(() => {
    if (!task?.id || ["failed", "cancelled", "interrupted"].includes(task.status)) return;
    let disposed = false, polling = false;
    async function poll() {
      if (polling) return;
      polling = true;
      try {
        const current = await api.getTask(task.id);
        if (disposed) return;
        setTask(current);
        if (["succeeded", "completed"].includes(current.status)) {
          const list = await api.listArtifacts();
          const artifact = list.find((a2) => a2.taskId === current.id || a2.id === current.artifactId);
          if (!disposed && artifact) {
            setResult(artifact);
            window.clearInterval(timer);
          }
        } else if (["failed", "cancelled", "interrupted"].includes(current.status)) {
          setError(current.error || current.message || "裁剪任务未完成，请查看任务详情。");
          window.clearInterval(timer);
        }
      } catch (e2) {
        if (!disposed) setError(friendlyError(e2));
      } finally {
        polling = false;
      }
    }
    void poll();
    const timer = window.setInterval(() => void poll(), 1500);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [task?.id]);
  async function submit() {
    setError("");
    try {
      if (!region) throw new Error(regionError || "请先完成区域绘制。");
      if (flatten && !plane) throw new Error("请先显示压平工具并拖动目标平面。");
      const request2 = clipTaskRequest({ input, output, name: `${name || "模型"} · ${title}`, ...restoreClipRegion(region) });
      if (flatten && plane) {
        request2.operation = "flatten-tileset";
        request2.options = { flatten: { region, heightMeters: plane.heightMeters }, preview: { sourceArtifactId } };
      }
      setSubmitting(true);
      const response = await api.createTask(request2);
      const id2 = response.id || response.task?.id;
      if (!id2) throw new Error("后端未返回任务编号。");
      command("stop");
      planeCommand("stop");
      setResult(null);
      setTask({ id: id2, name: request2.taskName || "", operation: request2.operation, input, output, status: "queued" });
    } catch (e2) {
      setError(friendlyError(e2));
    } finally {
      setSubmitting(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "info-panel preview-operation-panel", "aria-label": "模型操作", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inspector-head", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-ghost btn-sm", type: "button", onClick: onClose, children: "关闭操作" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: flatten ? "画出区域，拖动竖直手柄调整目标平面，导出新模型。" : "绘制要保留的区域，导出新的 3D Tiles 模型。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "preview-draw-mode", children: "绘制方式" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { id: "preview-draw-mode", className: "input", value: mode, disabled: busy, onChange: (e2) => {
        const next = e2.target.value;
        setMode(next);
        command("clear");
        command("stop");
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "rectangle", children: "矩形" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "polygon", children: "多边形" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", type: "button", disabled: busy, onClick: () => {
      planeCommand("clear");
      setPlane(null);
      setTask(null);
      setResult(null);
      setDrawing(null);
      command("start");
    }, children: "开始绘制" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "field-hint", children: [
      mode === "rectangle" ? "在模型上按住左键拖出矩形。" : "左键点选顶点，右键或点击完成绘制闭合区域。",
      "完成后可拖动黄色顶点调整。",
      flatten ? "区域内的全部表面移到目标面，边界补连接侧壁。" : "区域不限高度，不自动封口。"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm", type: "button", disabled: busy || !drawing?.points.length, onClick: () => command("undo"), children: "撤销顶点" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm", type: "button", disabled: busy || !drawing?.points.length, onClick: () => command("clear"), children: "清空区域" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm", type: "button", disabled: busy || !drawing || drawing.complete || drawing.points.length < (mode === "rectangle" ? 2 : 3), onClick: () => command("finish"), children: "完成绘制" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: drawing?.complete ? `区域已闭合 · ${drawing.points.length} 个控制点` : drawing?.active ? `已绘制 ${drawing.points.length} 个控制点` : "尚未开始绘制" }),
    regionError ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "error", children: regionError }) : null,
    region ? /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { children: "区域参数" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "preview-region-json", children: JSON.stringify(region, null, 2) })
    ] }) : null,
    flatten ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", type: "button", disabled: busy || !region, onClick: () => {
        command("stop");
        planeCommand("start");
      }, children: "显示压平拖拽工具" }),
      plane ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("output", { "aria-label": "目标平面高度", children: [
          "目标平面：",
          plane.heightMeters.toFixed(2),
          " m"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: "沿青色箭头拖动；俯视时可抓住圆点上下拖动。拖动时锁定相机。高度相对区域中心的椭球面，沿当地竖直方向计算。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm", type: "button", disabled: busy || !plane.hasUndo, onClick: () => planeCommand("undo"), children: "撤销高度调整" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm", type: "button", disabled: busy, onClick: () => planeCommand("reset"), children: "恢复原高度" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: "青色目标面和示意侧壁实时更新；精确分割、纹理和侧壁以导出模型为准。新侧壁沿用表面材质，纹理按米铺设。" })
      ] }) : null
    ] }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "preview-clip-output", children: flatten ? "压平成果目录" : "裁剪成果目录" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { id: "preview-clip-output", className: "input", value: output, disabled: busy, onChange: (e2) => setOutput(e2.target.value) }),
      isTauri() ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm", type: "button", disabled: busy, onClick: () => void api.selectOutputDirectory().then((path) => {
        if (path) setOutput(suggestOutputPath("clipped", path, `_${Date.now().toString(36)}`));
      }).catch((e2) => setError(friendlyError(e2))), children: "选择父目录" }) : null
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: "仅支持已有地理定位的静态 GLB / 无批次 B3DM；区域距中心不超过 10 公里。成果目录须尚不存在。" }),
    error ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "error", children: error }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", type: "button", disabled: busy || !region || flatten && !plane, onClick: () => void submit(), children: busy ? "正在处理…" : flatten ? "导出压平模型" : "导出裁剪模型" }),
    task ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { role: "status", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        title,
        "任务：",
        task.status
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: `/processing?task=${encodeURIComponent(task.id)}`, children: [
        "查看",
        flatten ? "压平" : "裁剪",
        "任务"
      ] })
    ] }) : null,
    result ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn btn-primary", type: "button", onClick: () => onResult(result), children: [
      "打开",
      flatten ? "压平" : "裁剪",
      "后模型"
    ] }) : null
  ] });
}
const HEADER_FIELDS = ["GlobalId", "IfcClass", "Name", "Storey"];
const OTHER_GROUP = "其他属性";
function formatPropertyValue(value) {
  if (value === null || value === void 0) return "";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(10)));
  }
  if (Array.isArray(value)) return value.map(formatPropertyValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function groupFeatureProperties(properties) {
  const headerValues = /* @__PURE__ */ new Map();
  const groups = /* @__PURE__ */ new Map();
  for (const property of properties) {
    const value = formatPropertyValue(property.value);
    if (HEADER_FIELDS.includes(property.name)) {
      headerValues.set(property.name, value);
      continue;
    }
    if (!value) continue;
    const dot = property.name.indexOf(".");
    const group = dot > 0 ? property.name.slice(0, dot) : OTHER_GROUP;
    const name = dot > 0 ? property.name.slice(dot + 1) : property.name;
    const entries = groups.get(group) || [];
    entries.push({ name, value });
    groups.set(group, entries);
  }
  const header = HEADER_FIELDS.filter((field) => headerValues.has(field)).map((field) => ({
    name: field,
    value: headerValues.get(field) || "—"
  }));
  const ordered = [...groups.entries()].sort(([a2], [b]) => a2 === OTHER_GROUP ? 1 : b === OTHER_GROUP ? -1 : a2.localeCompare(b)).map(([name, entries]) => ({ name, entries }));
  return { header, groups: ordered };
}
function toggleHiddenFacet(hidden, field, value) {
  const current = hidden[field] || [];
  const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
  const result = { ...hidden, [field]: next };
  if (!next.length) delete result[field];
  return result;
}
function hiddenFacetCount(hidden) {
  return Object.values(hidden).reduce((sum, values) => sum + values.length, 0);
}
const facetLabels = { IfcClass: "IFC 类", Storey: "楼层" };
function FeaturePanel({ facets, properties, hidden, onHiddenChange, onClose }) {
  const grouped = properties ? groupFeatureProperties(properties) : null;
  const facetFields = Object.entries(facets?.fields || {});
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "info-panel feature-panel", "aria-label": "构件属性", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inspector-head", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "构件属性" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-ghost btn-sm", type: "button", "aria-label": "关闭构件属性", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsx(n, { size: 16 }) })
    ] }),
    facets && !facets.metadata ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted feature-panel__note", children: "已加载的瓦片没有 EXT_structural_metadata 属性表，无法查看构件属性。" }) : null,
    facetFields.length ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "feature-panel__filters", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "feature-panel__row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "显示" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn btn-ghost btn-sm",
            type: "button",
            disabled: !hiddenFacetCount(hidden),
            onClick: () => onHiddenChange({}),
            children: "全部显示"
          }
        )
      ] }),
      facetFields.map(([field, values]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "feature-facet", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: facetLabels[field] || field }),
        values.map(([value, count]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "feature-facet__item", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: !(hidden[field] || []).includes(value),
              onChange: () => onHiddenChange(toggleHiddenFacet(hidden, field, value))
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { title: value || "（无）", children: value || "（无）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "muted", children: count })
        ] }, value))
      ] }, field)),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: facets?.scope === "tileset" ? `全模型共 ${facets.features} 个构件，当前已加载 ${facets.loaded ?? 0} 个。` : `按已加载的瓦片统计，共 ${facets?.features ?? 0} 个构件。` })
    ] }) : null,
    grouped ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "feature-panel__selected", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "summary-box", children: /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { children: grouped.header.map((entry) => /* @__PURE__ */ jsxRuntimeExports.jsx(FeatureEntry, { name: entry.name, value: entry.value }, entry.name)) }) }),
      grouped.groups.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "feature-group", open: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { children: [
          group.name,
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "muted", children: group.entries.length })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { children: group.entries.map((entry) => /* @__PURE__ */ jsxRuntimeExports.jsx(FeatureEntry, { name: entry.name, value: entry.value }, entry.name)) })
      ] }, group.name))
    ] }) : facets?.metadata !== false ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted feature-panel__note", children: "点击模型中的构件查看属性。" }) : null
  ] });
}
function FeatureEntry({ name, value }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { title: name, children: name }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { title: value, children: value })
  ] });
}
function useMenuDismiss(ref, open, close) {
  reactExports.useEffect(() => {
    if (!open) return;
    function pointer(event) {
      if (!ref.current?.contains(event.target)) close();
    }
    function key(event) {
      if (event.key === "Escape") {
        close();
        ref.current?.querySelector("button")?.focus();
      }
    }
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", key);
    };
  }, [ref, open, close]);
}
function TilesPreview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [artifacts, setArtifacts] = reactExports.useState([]);
  const [selectedId, setSelectedId] = reactExports.useState(searchParams.get("artifact") || "");
  const [tilesetUrl, setTilesetUrl] = reactExports.useState("");
  const [dataName, setDataName] = reactExports.useState("");
  const [inputPath, setInputPath] = reactExports.useState("");
  const [frameKey, setFrameKey] = reactExports.useState(0);
  const [error, setError] = reactExports.useState(null);
  const [loadState, setLoadState] = reactExports.useState("idle");
  const [infoOpen, setInfoOpen] = reactExports.useState(false);
  const [diagOpen, setDiagOpen] = reactExports.useState(false);
  const [processOpen, setProcessOpen] = reactExports.useState(false);
  const [diagNote, setDiagNote] = reactExports.useState("");
  const [operation, setOperation] = reactExports.useState(null);
  const [canClip, setCanClip] = reactExports.useState(false);
  const [featuresOpen, setFeaturesOpen] = reactExports.useState(false);
  const [facets, setFacets] = reactExports.useState(null);
  const [pickedProperties, setPickedProperties] = reactExports.useState(null);
  const [hiddenFacets, setHiddenFacets] = reactExports.useState({});
  const loadGeneration = reactExports.useRef(0);
  const iframeRef = reactExports.useRef(null);
  const menuRef = reactExports.useRef(null);
  useMenuDismiss(menuRef, processOpen, () => setProcessOpen(false));
  const hasData = Boolean(tilesetUrl);
  reactExports.useEffect(() => {
    const artifact = artifacts.find((a2) => a2.id === selectedId);
    if (artifact) setDataName(artifact.label || artifact.id);
  }, [artifacts, selectedId]);
  reactExports.useEffect(() => {
    void (async () => {
      try {
        const list = await api.listArtifacts();
        setArtifacts(list);
      } catch (e2) {
        setError(friendlyError(e2));
      }
    })();
  }, []);
  reactExports.useEffect(() => {
    const artifact = searchParams.get("artifact");
    const tileset = searchParams.get("tileset");
    if (artifact) {
      void loadArtifact(artifact);
      return;
    }
    if (tileset) {
      loadGeneration.current++;
      setInputPath("");
      setCanClip(false);
      setOperation(null);
      const url = absolutizeLocalUrl(tileset);
      setTilesetUrl(url);
      setDataName("外部 tileset");
      setSelectedId("");
      setFrameKey((k2) => k2 + 1);
      setLoadState("loading");
    }
  }, [searchParams.get("artifact"), searchParams.get("tileset")]);
  reactExports.useEffect(() => {
    function onMessage(ev) {
      if (ev.source !== iframeRef.current?.contentWindow || ev.origin !== window.location.origin) return;
      const data = ev.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "geoforge-preview-ready") {
        setLoadState("ready");
        setCanClip(data.canClip === true);
        if (data.canClip === true && searchParams.get("operation") === "flatten") setOperation("flatten");
        setError(null);
        if (data.diag) setDiagNote(String(data.diag));
      } else if (data.type === "geoforge-preview-error") {
        setLoadState("error");
        setError(data.message || "加载失败");
      } else if (data.type === "geoforge-preview-loading") {
        setLoadState("loading");
      } else if (data.type === "geoforge-feature-facets") {
        setFacets({
          scope: data.scope === "tileset" ? "tileset" : "loaded",
          features: Number(data.features) || 0,
          loaded: Number(data.loaded) || 0,
          metadata: data.metadata === true,
          fields: data.fields || {}
        });
      } else if (data.type === "geoforge-feature-picked") {
        setPickedProperties(Array.isArray(data.properties) ? data.properties : null);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [searchParams]);
  reactExports.useEffect(() => {
    setFacets(null);
    setPickedProperties(null);
    setHiddenFacets({});
  }, [frameKey]);
  const featuresActive = featuresOpen && !operation && loadState === "ready";
  reactExports.useEffect(() => {
    postFrame({ type: "geoforge-features", action: featuresActive ? "enable" : "disable" });
    if (!featuresActive) {
      setPickedProperties(null);
      setHiddenFacets({});
    }
  }, [featuresActive, frameKey]);
  function postFrame(message) {
    try {
      iframeRef.current?.contentWindow?.postMessage(message, window.location.origin);
    } catch {
    }
  }
  function changeHiddenFacets(hidden) {
    setHiddenFacets(hidden);
    postFrame({ type: "geoforge-features", action: "filter", hidden });
  }
  async function loadArtifact(id2) {
    const generation = ++loadGeneration.current;
    setCanClip(false);
    setOperation(null);
    setInputPath("");
    setTilesetUrl("");
    setSelectedId(id2);
    setError(null);
    setDiagNote("");
    if (!id2) {
      setTilesetUrl("");
      setDataName("");
      setInputPath("");
      setLoadState("idle");
      return;
    }
    setLoadState("loading");
    try {
      const res = await api.previewUrl(id2);
      if (generation !== loadGeneration.current) return;
      const url = res.url || res.previewUrl || "";
      if (!url) {
        setLoadState("error");
        setError("无法解析预览地址");
        return;
      }
      setTilesetUrl(url);
      const art = artifacts.find((a2) => a2.id === id2);
      setDataName(art?.label || id2);
      setInputPath(res.path || art?.path || "");
      setFrameKey((k2) => k2 + 1);
    } catch (e2) {
      if (generation !== loadGeneration.current) return;
      setLoadState("error");
      setError(friendlyError(e2));
    }
  }
  async function openData() {
    setProcessOpen(false);
    if (isTauri()) {
      const p2 = await selectTilesetFile();
      if (!p2) return;
      const normalized = (path) => path.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
      const match = artifacts.find((a2) => a2.path && normalized(p2) === `${normalized(a2.path)}/tileset.json`);
      if (match) {
        setSearchParams({ artifact: match.id });
        return;
      }
      try {
        if (!/[/\\]tileset\.json$/i.test(p2)) throw new Error("当前预览入口请选择 tileset.json 文件。");
        const registered = await api.registerArtifact(p2.replace(/[/\\]tileset\.json$/i, ""), { label: p2.split(/[/\\]/).slice(-2, -1)[0] || "本地数据" });
        setArtifacts(await api.listArtifacts());
        setSearchParams({ artifact: registered.artifact.id });
      } catch (e2) {
        setError(friendlyError(e2));
      }
      return;
    }
    const first = artifacts.find((a2) => a2.has_tileset || a2.hasTileset);
    if (first) {
      setSearchParams({ artifact: first.id });
    } else {
      setError("暂无可用成果，请先完成转换。");
    }
  }
  function fitView() {
    if (!hasData || loadState !== "ready") return;
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: "geoforge-fit" }, window.location.origin);
    } catch {
    }
  }
  const iframeSrc = hasData ? `/cesium-preview.html?tileset=${encodeURIComponent(tilesetUrl)}` : "";
  const processLinks = reactExports.useMemo(() => {
    const params = new URLSearchParams();
    if (inputPath) params.set("input", inputPath);
    if (selectedId) params.set("artifact", selectedId);
    if (dataName) params.set("name", dataName);
    const q2 = params.toString();
    return {
      rebuild: `/tiles/process?op=rebuild&${q2}`,
      texture: `/tiles/process?op=texture&${q2}`
    };
  }, [inputPath, selectedId, dataName]);
  const selected = artifacts.find((a2) => a2.id === selectedId) || null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "preview-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "preview-toolbar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "preview-toolbar__name", title: dataName || void 0, children: dataName || "未选择数据" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm", type: "button", onClick: () => void openData(), children: "打开数据" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn btn-sm",
          type: "button",
          disabled: !hasData || loadState !== "ready",
          onClick: fitView,
          children: "适应视野"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "menu", ref: menuRef, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            className: "btn btn-sm",
            type: "button",
            disabled: !hasData || !inputPath,
            onClick: () => setProcessOpen((v2) => !v2),
            "aria-haspopup": "menu",
            "aria-expanded": processOpen,
            children: [
              "模型操作 ",
              /* @__PURE__ */ jsxRuntimeExports.jsx(s$5, { size: 12 })
            ]
          }
        ),
        processOpen ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "menu__panel", role: "menu", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "menu__item", type: "button", disabled: loadState !== "ready" || !canClip, onClick: () => {
            setOperation("clip");
            setInfoOpen(false);
            setFeaturesOpen(false);
            setProcessOpen(false);
          }, children: "范围裁剪并导出" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "menu__item", type: "button", disabled: loadState !== "ready" || !canClip, onClick: () => {
            setOperation("flatten");
            setInfoOpen(false);
            setFeaturesOpen(false);
            setProcessOpen(false);
          }, children: "区域压平并导出" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "menu__divider" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { className: "menu__item", to: processLinks.rebuild, onClick: () => setProcessOpen(false), children: "顶层重建" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { className: "menu__item", to: processLinks.texture, onClick: () => setProcessOpen(false), children: "纹理压缩" })
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "preview-toolbar__spacer" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn btn-sm",
          type: "button",
          disabled: !hasData,
          onClick: () => {
            setOperation(null);
            setInfoOpen((v2) => !v2);
            setFeaturesOpen(false);
          },
          children: infoOpen ? "关闭信息" : "信息"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn btn-sm",
          type: "button",
          disabled: !hasData || loadState !== "ready",
          "aria-pressed": featuresOpen,
          onClick: () => {
            setOperation(null);
            setInfoOpen(false);
            setFeaturesOpen((v2) => !v2);
          },
          children: "属性"
        }
      )
    ] }),
    error && loadState === "error" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: 8 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "error", children: error }) }) : null,
    error && loadState === "idle" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: 8 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "warn", children: error }) }) : null,
    hasData && loadState === "ready" && !canClip ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "warn", children: "此模型使用预览临时定位，无法按地理区域裁剪。请先为原始数据配置地理定位。" }) : null,
    error && loadState === "ready" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "error", children: error }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `preview-layout${infoOpen || operation || featuresActive ? " with-panel" : ""}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "preview-main", children: !hasData ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "preview-empty", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "打开 3D Tiles 数据以开始预览" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", type: "button", onClick: () => void openData(), children: "打开数据" }),
        artifacts.some((a2) => a2.has_tileset || a2.hasTileset) ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            className: "select",
            style: { maxWidth: 320 },
            value: "",
            onChange: (e2) => {
              if (!e2.target.value) return;
              setSearchParams({ artifact: e2.target.value });
            },
            "aria-label": "从成果选择",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "从成果选择…" }),
              artifacts.filter((a2) => a2.has_tileset || a2.hasTileset).map((a2) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: a2.id, children: a2.label || a2.id }, a2.id))
            ]
          }
        ) : null
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        loadState === "loading" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "preview-status", children: "加载中…" }) : null,
        loadState === "ready" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "preview-status", children: "加载完成" }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "iframe",
          {
            ref: iframeRef,
            className: "preview-frame",
            title: "Cesium Tiles Preview",
            src: iframeSrc
          },
          `${frameKey}:${tilesetUrl}`
        )
      ] }) }),
      operation && loadState === "ready" && canClip ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        PreviewClipPanel,
        {
          input: inputPath,
          name: dataName,
          frame: iframeRef,
          operation,
          sourceArtifactId: selectedId,
          onClose: () => setOperation(null),
          onResult: (artifact) => {
            setArtifacts((list) => [...list.filter((a2) => a2.id !== artifact.id), artifact]);
            setSearchParams({ artifact: artifact.id });
          }
        },
        `${operation}:${frameKey}:${tilesetUrl}`
      ) : null,
      featuresActive ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        FeaturePanel,
        {
          facets,
          properties: pickedProperties,
          hidden: hiddenFacets,
          onHiddenChange: changeHiddenFacets,
          onClose: () => setFeaturesOpen(false)
        }
      ) : null,
      infoOpen && !operation ? /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "info-panel", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inspector-head", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "数据信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-ghost btn-sm", type: "button", "aria-label": "关闭数据信息", onClick: () => setInfoOpen(false), children: /* @__PURE__ */ jsxRuntimeExports.jsx(n, { size: 16 }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "summary-box", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "名称" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: dataName || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "路径" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: selected?.path || inputPath || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "状态" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: loadState === "loading" ? "加载中" : loadState === "ready" ? "加载完成" : loadState === "error" ? "失败" : "未加载" })
        ] }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { open: diagOpen, onToggle: (e2) => setDiagOpen(e2.target.open), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "muted", style: { cursor: "pointer", fontSize: 13 }, children: "诊断信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "summary-box", style: { marginTop: 8 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "预览 URL" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: tilesetUrl || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "说明" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: diagNote || "—" })
          ] }) })
        ] })
      ] }) : null
    ] })
  ] });
}
function isTerrainArtifact(artifact) {
  return artifact.kind === "terrain";
}
const NODATA_POLICIES = {
  "none-required": "源数据无空洞",
  interpolate: "插值填补",
  "explicit-constant": "固定值填补"
};
function noDataPolicyLabel(policy) {
  if (!policy) return "未记录";
  return NODATA_POLICIES[policy] || policy;
}
function fixed(value, digits) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : null;
}
function formatArea(km2) {
  if (typeof km2 !== "number" || !Number.isFinite(km2)) return "面积未知";
  return km2 >= 100 ? `${Math.round(km2).toLocaleString("zh-CN")} km²` : `${km2.toFixed(km2 >= 1 ? 1 : 3)} km²`;
}
function terrainSummaryLine(summary) {
  if (!summary) return "没有成果报告（geoforge-terrain.json）";
  if (summary.reportError) return summary.reportError;
  const parts = [formatArea(summary.areaKm2)];
  if (typeof summary.maxDepth === "number") parts.push(`层级 0–${summary.maxDepth}`);
  if (typeof summary.tiles === "number") parts.push(`${summary.tiles.toLocaleString("zh-CN")} 个瓦片`);
  const rmse = fixed(summary.sampleRmseM, 2);
  if (rmse) parts.push(`采样 RMSE ${rmse} m`);
  parts.push(`NoData：${noDataPolicyLabel(summary.noDataPolicy)}`);
  return parts.join(" · ");
}
function boundsText(bounds) {
  if (!bounds || bounds.length !== 4) return "—";
  const [w2, s2, e2, n2] = bounds.map((v2) => v2.toFixed(5));
  return `经度 ${w2}° – ${e2}°，纬度 ${s2}° – ${n2}°`;
}
function terrainFrameSrc(terrainUrl, summary) {
  const params = new URLSearchParams();
  params.set("terrain", terrainUrl);
  if (summary?.bounds && summary.bounds.length === 4) params.set("bounds", summary.bounds.join(","));
  if (typeof summary?.heightMinM === "number") params.set("hmin", String(summary.heightMinM));
  if (typeof summary?.heightMaxM === "number") params.set("hmax", String(summary.heightMaxM));
  return `/terrain-preview.html?${params.toString()}`;
}
function displayPath(path) {
  return (path || "").replace(/^\\\\\?\\/, "");
}
function metres(value, digits = 2) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(digits)} m` : "—";
}
function TerrainPreview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const artifactId = searchParams.get("artifact") || "";
  const [artifacts, setArtifacts] = reactExports.useState([]);
  const [terrainUrl, setTerrainUrl] = reactExports.useState("");
  const [summary, setSummary] = reactExports.useState(null);
  const [loadState, setLoadState] = reactExports.useState("idle");
  const [tilesIdle, setTilesIdle] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [exaggeration, setExaggeration] = reactExports.useState(1);
  const [shading, setShading] = reactExports.useState("ramp");
  const [wireframe, setWireframe] = reactExports.useState(false);
  const [infoOpen, setInfoOpen] = reactExports.useState(true);
  const [pick, setPick] = reactExports.useState(null);
  const [frameKey, setFrameKey] = reactExports.useState(0);
  const iframeRef = reactExports.useRef(null);
  const terrainArtifacts = artifacts.filter(isTerrainArtifact);
  const selected = artifacts.find((a2) => a2.id === artifactId) || null;
  reactExports.useEffect(() => {
    void (async () => {
      try {
        setArtifacts(await api.listArtifacts());
      } catch (e2) {
        setError(friendlyError(e2));
      }
    })();
  }, []);
  reactExports.useEffect(() => {
    if (!artifactId) return;
    let cancelled = false;
    setTerrainUrl("");
    setError(null);
    setLoadState("loading");
    setTilesIdle(false);
    void (async () => {
      try {
        const res = await api.previewUrl(artifactId);
        if (cancelled) return;
        if (res.kind !== "terrain") {
          setLoadState("error");
          setError("该成果不是地形成果，请在 3D Tiles 预览中打开。");
          return;
        }
        setSummary(res.terrain || null);
        setTerrainUrl(res.terrainUrl || res.url);
        setFrameKey((k2) => k2 + 1);
      } catch (e2) {
        if (cancelled) return;
        setLoadState("error");
        setError(friendlyError(e2));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artifactId]);
  reactExports.useEffect(() => {
    function onMessage(ev) {
      if (ev.source !== iframeRef.current?.contentWindow || ev.origin !== window.location.origin) return;
      const data = ev.data || {};
      if (data.type === "geoforge-terrain-loading") setLoadState("loading");
      if (data.type === "geoforge-terrain-ready") setLoadState("ready");
      if (data.type === "geoforge-terrain-idle") setTilesIdle(true);
      if (data.type === "geoforge-terrain-error") {
        setLoadState("error");
        setError(String(data.message || "地形加载失败"));
      }
      if (data.type === "geoforge-terrain-pick") setPick(data);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  function post(message) {
    iframeRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }
  reactExports.useEffect(() => {
    if (loadState === "ready") post({ type: "geoforge-terrain-style", exaggeration, shading, wireframe });
  }, [loadState, exaggeration, shading, wireframe]);
  function view(which) {
    setTilesIdle(false);
    post({ type: "geoforge-terrain-view", view: which });
  }
  const ready = loadState === "ready";
  const statusText = loadState === "loading" ? "加载中…" : ready ? tilesIdle ? "加载完成" : "瓦片加载中…" : loadState === "error" ? "加载失败" : "";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "preview-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "preview-toolbar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "preview-toolbar__name", title: selected?.path, children: selected?.label || (artifactId ? artifactId : "未选择地形成果") }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "select",
        {
          className: "select",
          style: { maxWidth: 240 },
          "aria-label": "选择地形成果",
          value: artifactId,
          onChange: (e2) => setSearchParams(e2.target.value ? { artifact: e2.target.value } : {}),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "选择地形成果…" }),
            terrainArtifacts.map((a2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: a2.id, disabled: a2.previewable === false, children: [
              a2.label || a2.id,
              a2.previewable === false ? "（不可预览）" : ""
            ] }, a2.id))
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm", type: "button", disabled: !ready, onClick: () => view("overview"), children: "重置视角" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm", type: "button", disabled: !ready, onClick: () => view("edge"), children: "数据边缘近景" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "preview-toolbar__field", title: "只改变显示，不改变成果", children: [
        "地形夸张",
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            className: "select",
            "aria-label": "地形夸张",
            value: exaggeration,
            disabled: !ready,
            onChange: (e2) => setExaggeration(Number(e2.target.value)),
            children: [1, 2, 3, 5].map((v2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: v2, children: [
              v2,
              "×"
            ] }, v2))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "preview-toolbar__field", children: [
        "着色",
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            className: "select",
            "aria-label": "着色",
            value: shading,
            disabled: !ready,
            onChange: (e2) => setShading(e2.target.value),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "ramp", children: "高程着色" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "contour", children: "等高线" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "none", children: "无" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "preview-toolbar__field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: wireframe, disabled: !ready, onChange: (e2) => setWireframe(e2.target.checked) }),
        "线框"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "preview-toolbar__spacer" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm", type: "button", disabled: !selected, onClick: () => setInfoOpen((v2) => !v2), children: infoOpen ? "关闭信息" : "信息" })
    ] }),
    error ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: 8 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "error", children: error }) }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `preview-layout${infoOpen && selected ? " with-panel" : ""}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "preview-main", children: !artifactId ? terrainArtifacts.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "preview-empty", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "从上方选择一个地形成果开始预览" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        EmptyState,
        {
          title: "暂无地形成果",
          description: "地形切片任务成功后，成果会自动登记到这里。"
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        statusText ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "preview-status", children: statusText }) : null,
        terrainUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "iframe",
          {
            ref: iframeRef,
            className: "preview-frame",
            title: "Cesium 地形预览",
            src: terrainFrameSrc(terrainUrl, summary)
          },
          `${frameKey}:${terrainUrl}`
        ) : null
      ] }) }),
      infoOpen && selected ? /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "info-panel", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inspector-head", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "地形信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-ghost btn-sm", type: "button", "aria-label": "关闭地形信息", onClick: () => setInfoOpen(false), children: /* @__PURE__ */ jsxRuntimeExports.jsx(n, { size: 16 }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "summary-box", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "成果" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { style: { wordBreak: "break-all" }, children: displayPath(selected.path) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "范围" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { children: [
            boundsText(summary?.bounds),
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
            formatArea(summary?.areaKm2)
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "层级 / 瓦片" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { children: [
            "0–",
            summary?.maxDepth ?? "—",
            summary?.maxDepthAuto ? "（自动）" : "",
            " / ",
            summary?.tiles ?? "—"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "高程范围" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { children: [
            metres(summary?.heightMinM),
            " – ",
            metres(summary?.heightMaxM)
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "采样误差" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { children: [
            "RMSE ",
            metres(summary?.sampleRmseM, 3),
            "，P95 ",
            metres(summary?.sampleP95M, 3),
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
            "无洞非陡崖 RMSE ",
            metres(summary?.sampleCleanRmseM, 3)
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "NoData" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { children: [
            noDataPolicyLabel(summary?.noDataPolicy),
            typeof summary?.sourceHoleCount === "number" && summary.sourceHoleCount > 0 ? `（源内空洞 ${summary.sourceHoleCount.toLocaleString("zh-CN")} 个像元）` : ""
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "坐标系" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { children: [
            summary?.crsName || "—",
            summary?.crsAuthority ? `（${summary.crsAuthority}）` : ""
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "高程基准" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: summary?.verticalConverted ? "已转换" : summary?.verticalNote || "未进行垂直基准转换" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "鼠标处" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: pick ? `${pick.lon.toFixed(6)}°, ${pick.lat.toFixed(6)}°，${metres(pick.height)}${pick.inside ? "" : "（数据范围外）"}` : "将鼠标移到地形上" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", style: { fontSize: 12 }, children: "离线预览：没有在线底图，颜色只表示高程。地形夸张只改变显示。数据范围外的 0 m 平面只用于显示。" }),
        isTauri() ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm", type: "button", onClick: () => void api.openArtifactDirectory(selected.id).catch((e2) => setError(friendlyError(e2))), children: "打开文件夹" }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { className: "btn btn-sm", to: "/results", style: { marginLeft: 8 }, children: "返回成果" })
      ] }) : null
    ] })
  ] });
}
function fmtTime(v2) {
  if (v2 == null) return "—";
  const d = new Date(v2 * (v2 < 1e12 ? 1e3 : 1));
  return d.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
}
async function openDir(id2) {
  try {
    await api.openArtifactDirectory(id2);
  } catch (e2) {
    console.warn(friendlyError(e2));
  }
}
function Results() {
  const [artifacts, setArtifacts] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [copied, setCopied] = reactExports.useState(null);
  const [query, setQuery] = reactExports.useState("");
  const [menuId, setMenuId] = reactExports.useState(null);
  const menuRef = reactExports.useRef(null);
  useMenuDismiss(menuRef, Boolean(menuId), () => setMenuId(null));
  reactExports.useEffect(() => {
    void (async () => {
      try {
        setArtifacts(await api.listArtifacts());
      } catch (e2) {
        setError(friendlyError(e2));
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const filtered = reactExports.useMemo(() => {
    const q2 = query.trim().toLowerCase();
    if (!q2) return artifacts;
    return artifacts.filter(
      (a2) => (a2.label || "").toLowerCase().includes(q2) || (a2.path || "").toLowerCase().includes(q2) || (a2.id || "").toLowerCase().includes(q2)
    );
  }, [artifacts, query]);
  async function copyPath(path) {
    try {
      await navigator.clipboard?.writeText(path);
      setCopied(path);
      window.setTimeout(() => setCopied(null), 2e3);
    } catch {
      setCopied(null);
    }
  }
  function processHref(a2) {
    const params = new URLSearchParams();
    params.set("artifact", a2.id);
    params.set("input", a2.path);
    params.set("output", suggestOutputPath(a2.path, "", "_process"));
    params.set("name", `${a2.label || a2.id}-process`);
    return `/tiles/process?${params.toString()}`;
  }
  function previewHref(a2) {
    if (isTerrainArtifact(a2)) return `/preview/terrain?artifact=${encodeURIComponent(a2.id)}`;
    const hasTiles = a2.has_tileset || a2.hasTileset;
    if (!hasTiles) return "/preview/tiles";
    return `/preview/tiles?artifact=${encodeURIComponent(a2.id)}`;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page-header full-width", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "成果" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "预览成果或继续处理。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "search-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "search-wrap__icon", "aria-hidden": true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(f, { size: 16 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "input",
            placeholder: "搜索成果…",
            value: query,
            onChange: (e2) => setQuery(e2.target.value),
            "aria-label": "搜索成果"
          }
        )
      ] })
    ] }),
    error ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "warn", children: error }) }) : null,
    copied ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "success", children: "已复制路径" }) }) : null,
    loading && artifacts.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "muted", children: "加载中…" }) : artifacts.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { title: "暂无成果", description: "转换成功后，输出会登记到成果列表。" }) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: "未找到成果" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "result-list", children: filtered.map((a2) => {
      const terrain = isTerrainArtifact(a2);
      const hasTiles = terrain ? a2.previewable !== false : a2.has_tileset || a2.hasTileset;
      const missing = a2.available === false;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "result-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "result-row__body", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { title: displayPath(a2.path), children: a2.label || a2.id }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "result-path", title: displayPath(a2.path), children: displayPath(a2.path) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "result-row__meta", children: [
            missing ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--danger)" }, children: "文件不存在" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: terrain ? "Cesium 地形" : "3D Tiles" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: " · " }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: fmtTime(a2.createdAt || a2.created_at) })
          ] }),
          terrain && !missing ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "result-row__meta", children: a2.status === "incomplete" ? "成果目录中没有 layer.json，无法预览" : terrainSummaryLine(a2.terrain) }) : null,
          missing ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "result-row__meta", children: "目录可能已被移动或删除。恢复到原位置后刷新本页即可重新预览，也可以重新运行任务。" }) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "result-row__actions", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Link,
            {
              className: "btn btn-sm",
              to: previewHref(a2),
              "aria-disabled": missing || !hasTiles,
              tabIndex: missing || !hasTiles ? -1 : void 0,
              onClick: (event) => {
                if (missing || !hasTiles) event.preventDefault();
              },
              style: missing || !hasTiles ? { pointerEvents: "none", opacity: 0.45 } : void 0,
              children: "预览"
            }
          ),
          terrain ? null : /* @__PURE__ */ jsxRuntimeExports.jsx(
            Link,
            {
              className: "btn btn-sm",
              to: processHref(a2),
              "aria-disabled": missing,
              tabIndex: missing ? -1 : void 0,
              onClick: (event) => {
                if (missing) event.preventDefault();
              },
              style: missing ? { pointerEvents: "none", opacity: 0.45 } : void 0,
              children: "继续处理"
            }
          ),
          isTauri() ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn btn-sm",
              type: "button",
              disabled: missing,
              onClick: () => void openDir(a2.id),
              children: "打开目录"
            }
          ) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "menu", ref: menuId === a2.id ? menuRef : void 0, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn btn-sm btn-ghost",
                type: "button",
                "aria-label": `更多 · ${a2.label || a2.id}`,
                "aria-expanded": menuId === a2.id,
                onClick: () => setMenuId((id2) => id2 === a2.id ? null : a2.id),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(n$5, { size: 18 })
              }
            ),
            menuId === a2.id ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "menu__panel", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "menu__item",
                type: "button",
                onClick: () => {
                  void copyPath(a2.path);
                  setMenuId(null);
                },
                children: "复制路径"
              }
            ) }) : null
          ] })
        ] })
      ] }, a2.id);
    }) })
  ] });
}
const defaults$6 = {
  defaultOutputRoot: "",
  defaultRebuildTop: true,
  defaultRebuildLevels: 0,
  defaultTextureCompress: false,
  defaultConvertThreads: 0,
  pythonServerUrl: "http://127.0.0.1:8787",
  resourceServerPort: 0,
  execution: {
    resourceMode: "auto"
  }
};
function Settings() {
  const [form, setForm] = reactExports.useState({ ...defaults$6 });
  const [saved, setSaved] = reactExports.useState(false);
  const [health, setHealth] = reactExports.useState(null);
  const [healthError, setHealthError] = reactExports.useState(null);
  const [resourceInfo, setResourceInfo] = reactExports.useState(null);
  const [capsText, setCapsText] = reactExports.useState(null);
  const [loadError, setLoadError] = reactExports.useState(null);
  reactExports.useEffect(() => {
    void (async () => {
      try {
        const s2 = await api.getSettings();
        setForm({ ...defaults$6, ...s2 });
      } catch (e2) {
        setLoadError(friendlyError(e2));
      }
      try {
        const h = await api.health();
        setHealth(
          `状态：${h.status || (h.ok ? "ok" : "unknown")}${h.version ? ` · 版本 ${h.version}` : ""}`
        );
        setHealthError(null);
      } catch (e2) {
        setHealth(null);
        setHealthError(friendlyError(e2));
      }
      try {
        const caps = await api.capabilities();
        const parts = [];
        if (caps.convert?.exists) parts.push("本机转换器可用");
        else if (caps.convert?.docker) parts.push("Docker 转换可用");
        else parts.push("转换器不可用");
        if (caps.postprocessBasisu?.available) parts.push("basisu 可用");
        setCapsText(parts.join(" · "));
      } catch {
        setCapsText(null);
      }
      if (isTauri()) {
        try {
          const info = await api.getResourceServerInfo();
          if (info) {
            setResourceInfo(`${info.baseUrl} · ${info.dataDir}`);
          }
        } catch {
          setResourceInfo(null);
        }
      }
    })();
  }, []);
  async function save() {
    try {
      const next = await api.updateSettings(form);
      setForm({ ...defaults$6, ...next });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2e3);
    } catch (e2) {
      setLoadError(friendlyError(e2));
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "page-header", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "设置" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "任务默认参数与运行资源。" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page-form", children: [
      loadError ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "error", children: loadError }) }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormSection, { title: "默认参数", columns: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          PathField,
          {
            label: "默认输出根目录",
            value: form.defaultOutputRoot,
            placeholder: "例如 D:\\\\output",
            onChange: (v2) => setForm({ ...form, defaultOutputRoot: v2 }),
            onPick: isTauri() ? () => void selectOutputDirectory().then((p2) => {
              if (p2) setForm({ ...form, defaultOutputRoot: p2 });
            }).catch((e2) => setLoadError(friendlyError(e2))) : void 0,
            hint: "新建任务时用于建议输出路径"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Switch,
          {
            checked: form.defaultRebuildTop,
            onChange: (v2) => setForm({ ...form, defaultRebuildTop: v2 }),
            children: "默认开启顶层重建"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "默认重建层数" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "select",
              value: form.defaultRebuildLevels,
              onChange: (e2) => setForm({
                ...form,
                defaultRebuildLevels: Number(e2.target.value)
              }),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 0, children: "自动到根" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 1, children: "1" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 2, children: "2" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              checked: form.defaultTextureCompress,
              onChange: (v2) => setForm({ ...form, defaultTextureCompress: v2 }),
              children: "默认开启纹理压缩（KTX2）（实验）"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field-hint", children: "需要 basisu 运行时；如不可用请保持关闭（keep）" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "默认转换并发数" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "select",
              value: form.defaultConvertThreads ?? 0,
              onChange: (e2) => setForm({
                ...form,
                defaultConvertThreads: Number(e2.target.value)
              }),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 0, children: "自动（CPU 核心数一半，最多 8）" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 1, children: "1" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 2, children: "2" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 4, children: "4" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field-hint", children: "默认自动。转换、顶层重建和纹理压缩都按这个并发数运行；转换出错时可改为 1。" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormSection, { title: "资源配置", columns: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field span-all", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "资源模式" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "select",
              value: form.execution?.resourceMode ?? "auto",
              onChange: (e2) => {
                const mode = e2.target.value;
                setForm({
                  ...form,
                  execution: {
                    ...form.execution,
                    resourceMode: mode
                  }
                });
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "auto", children: "自动" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "custom", children: "自定义" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field-hint", children: form.execution?.resourceMode === "auto" ? "系统自动分配 CPU、内存和 I/O 资源" : "手动指定资源配额" })
        ] }),
        form.execution?.resourceMode === "custom" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "CPU 并发数" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "input",
                type: "number",
                min: "1",
                max: "64",
                value: form.execution?.cpuWorkers ?? "",
                placeholder: "自动",
                onChange: (e2) => setForm({
                  ...form,
                  execution: {
                    ...form.execution,
                    resourceMode: "custom",
                    cpuWorkers: e2.target.value ? Number(e2.target.value) : void 0
                  }
                })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field-hint", children: "空白表示自动（CPU 核心数一半）" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "内存预算 (MiB)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "input",
                type: "number",
                min: "512",
                max: "524288",
                value: form.execution?.memoryBudgetMiB ?? "",
                placeholder: "自动",
                onChange: (e2) => setForm({
                  ...form,
                  execution: {
                    ...form.execution,
                    resourceMode: "custom",
                    memoryBudgetMiB: e2.target.value ? Number(e2.target.value) : void 0
                  }
                })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field-hint", children: "处理进程树的工作内存预算，空白表示自动" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "I/O 并发数" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "input",
                type: "number",
                min: "1",
                max: "16",
                value: form.execution?.ioWorkers ?? "",
                placeholder: "自动",
                onChange: (e2) => setForm({
                  ...form,
                  execution: {
                    ...form.execution,
                    resourceMode: "custom",
                    ioWorkers: e2.target.value ? Number(e2.target.value) : void 0
                  }
                })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field-hint", children: "同时读写大文件的数量，空白表示自动" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "actions span-all", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-primary", onClick: () => void save(), children: "保存" }),
          saved ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "muted", children: "已保存" }) : null
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "advanced-block", style: { marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { children: "运行环境 / 诊断" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "advanced-block__body", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "API" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "input", value: api.baseUrl, readOnly: true })
          ] }),
          health ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "success", children: health }) : null,
          healthError ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "warn", children: healthError }) : null,
          capsText ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field-hint", style: { marginBottom: 12 }, children: capsText }) : null,
          resourceInfo ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "资源服务" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "input", value: resourceInfo, readOnly: true })
          ] }) : null,
          isTauri() ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "执行服务 URL" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "input",
                value: form.pythonServerUrl,
                onChange: (e2) => setForm({ ...form, pythonServerUrl: e2.target.value }),
                placeholder: "http://127.0.0.1:8787"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field-hint", children: "仅在本机转换器不可用时作为后备" })
          ] }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "actions span-all", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn", onClick: () => void save(), children: "保存诊断项" }) })
        ] })
      ] })
    ] })
  ] });
}
const CONFIG_KEY$2 = "geoforge.tiles.process.config";
const OUTPUT_TOUCHED_KEY = "geoforge.tiles.process.outputTouched";
const defaults$5 = {
  input: "",
  output: "",
  name: "",
  rebuildTop: true,
  quality: "balanced",
  rebuildLevels: 0,
  textureMode: "keep"
};
function loadConfig$2() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY$2);
    if (!raw) return defaults$5;
    return { ...defaults$5, ...JSON.parse(raw) };
  } catch {
    return defaults$5;
  }
}
function pageTitle(op) {
  if (op === "rebuild") return "顶层重建";
  if (op === "texture") return "纹理压缩";
  return "Tiles 处理";
}
function ProcessTiles() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const op = searchParams.get("op");
  const title = pageTitle(op);
  const opApplied = reactExports.useRef(false);
  const [form, setForm] = reactExports.useState(() => loadConfig$2());
  const [outputTouched, setOutputTouched] = reactExports.useState(() => {
    try {
      return localStorage.getItem(OUTPUT_TOUCHED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [message, setMessage] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const [caps, setCaps] = reactExports.useState(null);
  const [defaultOutputRoot, setDefaultOutputRoot] = reactExports.useState("");
  const [advancedOpen, setAdvancedOpen] = reactExports.useState(false);
  reactExports.useEffect(() => {
    void api.capabilities().then(setCaps).catch(() => setCaps(null));
    void api.getSettings().then((s2) => {
      setDefaultOutputRoot(s2.defaultOutputRoot || "");
      if (s2.defaultTextureCompress !== void 0) {
        setForm((f2) => {
          if (s2.defaultTextureCompress) {
            const ktx2Available = ktx2Etc1sEnabled(caps, true);
            return { ...f2, textureMode: ktx2Available ? "ktx2-etc1s" : "keep" };
          } else {
            return { ...f2, textureMode: "keep" };
          }
        });
      }
    }).catch(() => {
    });
  }, [caps]);
  reactExports.useEffect(() => {
    try {
      localStorage.setItem(CONFIG_KEY$2, JSON.stringify(form));
      localStorage.setItem(OUTPUT_TOUCHED_KEY, outputTouched ? "1" : "0");
    } catch {
    }
  }, [form, outputTouched]);
  reactExports.useEffect(() => {
    if (opApplied.current) return;
    if (op === "rebuild") {
      setForm((f2) => ({ ...f2, rebuildTop: true }));
      opApplied.current = true;
    } else if (op === "texture") {
      setForm((f2) => ({
        ...f2,
        textureMode: ktx2Etc1sEnabled(caps, true) ? "ktx2-etc1s" : f2.textureMode,
        rebuildTop: f2.rebuildTop
      }));
      opApplied.current = true;
    }
  }, [op, caps]);
  reactExports.useEffect(() => {
    const input = searchParams.get("input") || searchParams.get("path");
    const output = searchParams.get("output");
    const name = searchParams.get("name");
    const artifact = searchParams.get("artifact");
    if (!input && !output && !name && !artifact) return;
    setForm((f2) => ({
      ...f2,
      ...input ? { input } : {},
      ...output ? { output } : {},
      ...name ? { name } : {}
    }));
    if (output) setOutputTouched(true);
    if (artifact && !input) {
      void (async () => {
        try {
          const arts = await api.listArtifacts();
          const a2 = arts.find((x2) => x2.id === artifact);
          if (a2?.path) {
            setForm((f2) => ({
              ...f2,
              input: a2.path,
              name: f2.name || a2.label || ""
            }));
          }
        } catch {
        }
      })();
    }
  }, [searchParams]);
  reactExports.useEffect(() => {
    if (outputTouched) return;
    const suggested = suggestOutputPath(form.input, defaultOutputRoot, "_process");
    if (suggested && suggested !== form.output) {
      setForm((f2) => ({ ...f2, output: suggested }));
    }
  }, [form.input, defaultOutputRoot, outputTouched]);
  function update(key, value) {
    setForm((f2) => ({ ...f2, [key]: value }));
  }
  function handleReset() {
    const next = { ...defaults$5 };
    if (op === "rebuild") next.rebuildTop = true;
    if (op === "texture" && ktx2Etc1sEnabled(caps, true)) {
      next.textureMode = "ktx2-etc1s";
    }
    setForm(next);
    setOutputTouched(false);
    setMessage(null);
    setError(null);
    try {
      localStorage.removeItem(CONFIG_KEY$2);
      localStorage.removeItem(OUTPUT_TOUCHED_KEY);
    } catch {
    }
  }
  async function pickInputDirectory() {
    try {
      const path = await selectInputDirectory();
      if (path) update("input", path);
    } catch (error2) {
      setError(friendlyError(error2));
    }
  }
  async function pickTilesetFile() {
    try {
      const path = await selectTilesetFile();
      if (!path) return;
      const normalized = path.replace(/\\/g, "/");
      const dir = normalized.endsWith("/tileset.json") ? normalized.slice(0, -"/tileset.json".length) : normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/")) : path;
      update("input", dir || path);
    } catch (error2) {
      setError(friendlyError(error2));
    }
  }
  async function pickOutputParent() {
    try {
      const parent = await selectOutputDirectory();
      if (!parent) return;
      const output = suggestOutputPath(form.input, parent, "_process");
      if (!output) {
        setError("请先选择输入 tileset，再选择输出位置。");
        return;
      }
      setOutputTouched(true);
      update("output", output);
    } catch (error2) {
      setError(friendlyError(error2));
    }
  }
  async function handleSubmit() {
    setError(null);
    setMessage(null);
    if (!form.input.trim() || !form.output.trim()) {
      setError("请填写输入 tileset 目录与输出路径。");
      return;
    }
    if (pathsEqual(form.input, form.output)) {
      setError("输出目录不能与输入目录相同，请更换输出位置。");
      return;
    }
    if (!form.rebuildTop && form.textureMode === "keep") {
      setError("请启用顶层重建，或选择非保留的纹理模式。");
      return;
    }
    if (!textureModeEnabled(caps, form.textureMode, true)) {
      setError("当前安装包未包含可用的纹理压缩组件，请选择“保留原纹理”。");
      return;
    }
    setSubmitting(true);
    try {
      const preset = rebuildQualityOptions(form.quality, ktx2Etc1sEnabled(caps, true));
      const res = await api.createTask({
        operation: "process-tileset",
        input: { path: form.input.trim() },
        output: { path: form.output.trim() },
        taskName: form.name.trim() || void 0,
        options: {
          rebuildTop: {
            enabled: form.rebuildTop,
            levels: form.rebuildLevels,
            simplify: 0.5,
            textureScale: 0.5,
            l1MaxTriangles: preset.l1MaxTriangles,
            l2MaxTriangles: preset.l2MaxTriangles
          },
          texture: { mode: form.textureMode }
        }
      });
      const id2 = res.task?.id || res.id;
      setMessage(
        id2 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          "任务已创建 ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: `/processing?task=${encodeURIComponent(id2)}`, children: "查看任务" })
        ] }) : "任务已创建"
      );
      setOutputTouched(true);
      const nextOut = suggestOutputPath(
        form.input,
        defaultOutputRoot,
        `_process_${Date.now().toString(36)}`
      );
      if (nextOut) setForm((f2) => ({ ...f2, output: nextOut }));
      if (id2) navigate(`/processing?task=${encodeURIComponent(id2)}`);
    } catch (e2) {
      setError(friendlyError(e2));
    } finally {
      setSubmitting(false);
    }
  }
  const ktxOk = ktx2Etc1sEnabled(caps, true);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PageHeader,
      {
        title,
        description: "重建层级或处理纹理，生成独立成果。",
        actions: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", type: "button", onClick: () => setAdvancedOpen(true), children: "高级设置" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page-form", children: [
      error ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "error", children: error }) }) : null,
      message ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "success", children: message }) }) : null,
      !ktxOk && (op === "texture" || form.textureMode !== "keep") ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { kind: "warn", children: [
        "当前环境无法做 KTX2 纹理压缩。请检查 basisu 或转换能力。",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/settings", children: "打开设置" })
      ] }) }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormSection, { title: "数据", description: "选择要处理的源数据。", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          PathField,
          {
            label: "Tileset 目录",
            value: form.input,
            placeholder: "含 tileset.json",
            onChange: (v2) => update("input", v2),
            onPick: isTauri() ? () => void pickInputDirectory() : void 0
          }
        ),
        isTauri() ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", type: "button", onClick: () => void pickTilesetFile(), children: "选择 tileset.json" }) }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormSection, { title: "处理", description: "常用参数", columns: 3, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "顶层重建" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: form.rebuildTop, onChange: (v2) => update("rebuildTop", v2), children: form.rebuildTop ? "开启" : "关闭" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "纹理处理" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              "aria-label": "纹理处理",
              className: "select",
              value: form.textureMode,
              onChange: (e2) => update("textureMode", e2.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "keep", children: "保留原纹理" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: "ktx2-etc1s", disabled: !ktxOk, children: [
                  "KTX2 ETC1S",
                  ktxOk ? "（实验）" : "（不可用）"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: "ktx2", disabled: !ktxOk, children: [
                  "KTX2",
                  ktxOk ? "（实验）" : "（不可用）"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: "ktx2-uastc", disabled: !ktx2UastcEnabled(caps, true), children: [
                  "KTX2 UASTC",
                  ktx2UastcEnabled(caps, true) ? "（实验）" : "（不可用）"
                ] })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "重建质量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              "aria-label": "重建质量",
              className: "select",
              disabled: !form.rebuildTop,
              value: form.quality,
              onChange: (e2) => {
                const quality = e2.target.value;
                const preset = rebuildQualityOptions(quality, ktxOk);
                setForm((f2) => ({
                  ...f2,
                  quality,
                  rebuildLevels: preset.levels
                }));
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "quality", children: "质量优先" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "balanced", children: "均衡" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "speed", children: "性能优先" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FormSection, { title: "输出", description: "新建独立成果目录。", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        PathField,
        {
          label: "成果目录（选择父目录后自动生成）",
          value: form.output,
          onChange: (v2) => {
            setOutputTouched(true);
            update("output", v2);
          },
          onPick: isTauri() ? () => void pickOutputParent() : void 0
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Drawer, { title: "高级设置", open: advancedOpen, onClose: () => setAdvancedOpen(false), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "重建层数" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              "aria-label": "重建层数",
              className: "select",
              disabled: !form.rebuildTop,
              value: form.rebuildLevels,
              onChange: (e2) => update("rebuildLevels", Number(e2.target.value)),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 0, children: "自动到根" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 1, children: "1" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 2, children: "2" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field-hint", children: form.rebuildTop ? rebuildLevelsLabel(form.rebuildLevels) : "未启用顶层重建" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "muted", style: { cursor: "pointer", fontSize: 13 }, children: "任务信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", style: { marginTop: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "任务名" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                "aria-label": "任务名",
                className: "input",
                placeholder: "可选",
                value: form.name,
                onChange: (e2) => update("name", e2.target.value)
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SubmitBar,
        {
          onReset: handleReset,
          primaryLabel: submitting ? "提交中…" : "开始处理",
          onPrimary: () => void handleSubmit(),
          primaryDisabled: submitting
        }
      )
    ] })
  ] });
}
function samePath$1(left, right) {
  const normalize2 = (path) => path.trim().replace(/[/\\]+$/, "").replace(/\\/g, "/").toLowerCase();
  return Boolean(left.trim()) && normalize2(left) === normalize2(right);
}
function samePathList(left, right) {
  return left.length === right.length && left.every((path, index2) => samePath$1(path, right[index2]));
}
function modelScanMatchesCurrentInput(input) {
  return Boolean(
    input.scannedPath && samePath$1(input.scannedPath, input.currentPath) && samePath$1(input.debouncedPath, input.currentPath) && samePathList(input.scannedTextureRoots, input.textureRoots)
  );
}
function canSubmitModelScan(input) {
  return modelScanMatchesCurrentInput(input) && !input.scanPending && input.scanValid && (!input.scannedFormat || input.scannedFormat === input.selectedFormat);
}
function samePath(left, right) {
  const normalize2 = (path) => path.trim().replace(/[/\\]+$/, "").replace(/\\/g, "/").toLowerCase();
  return Boolean(left.trim()) && normalize2(left) === normalize2(right);
}
function buildModelOutputPath(modelFile, outputParent, outputId) {
  const fileName = modelFile.trim().split(/[/\\]/).pop() || "";
  const parent = outputParent.trim();
  if (!fileName || !parent || !outputId) return "";
  const stem = fileName.replace(/\.(fbx|obj)$/i, "");
  const separator = parent.includes("\\") ? "\\" : "/";
  const base = parent.replace(/[/\\]+$/, "");
  return `${base}${separator}${stem}_tiles_${outputId}`;
}
function modelOutputPathError(modelFile, output) {
  if (!modelFile.trim() || !output.trim()) return null;
  if (samePath(modelFile, output)) return "成果目录不能与模型文件相同。";
  const normalize2 = (path) => path.trim().replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  const modelDirectory = normalize2(modelFile).replace(/\/[^/]+$/, "");
  const outputDirectory = normalize2(output);
  if (modelDirectory && (outputDirectory === modelDirectory || outputDirectory.startsWith(`${modelDirectory}/`))) {
    return "成果目录不能位于模型文件所在目录内。请选择其他保存位置。";
  }
  if (outputDirectory && modelDirectory.startsWith(`${outputDirectory}/`)) {
    return "成果目录不能包含模型文件所在目录。请选择其他保存位置。";
  }
  return null;
}
function finiteNumber$1(value) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function modelConvertValidationError(input) {
  if (!input.input.trim() || !input.output.trim()) return "请选择模型文件和保存位置。";
  const outputError = modelOutputPathError(input.input, input.output);
  if (outputError) return outputError;
  if (input.format === "obj" && (input.unit === "fromMetadata" || input.axes === "fromMetadata")) {
    return "OBJ 不可靠地声明单位和轴向，请明确选择。";
  }
  if (input.georeferenceMode === "anchor") {
    const longitude = finiteNumber$1(input.longitude);
    const latitude = finiteNumber$1(input.latitude);
    const height = finiteNumber$1(input.height);
    if (longitude === null || latitude === null || height === null) {
      return "锚点定位需要有效的经度、纬度和椭球高数值。";
    }
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return "锚点经度范围为 -180 至 180，纬度范围为 -90 至 90。";
    }
  }
  if (input.georeferenceMode === "projected") {
    if (!input.sourceCrs.trim()) return "已有投影坐标模式需要完整的源 CRS（例如 EPSG:4547 或 WKT2）。";
    if (!input.projectedGeoreferenceSupported) return "当前转换器不支持已有投影坐标模式，请更新运行组件。";
    if ([input.originX, input.originY, input.originZ].some((value) => finiteNumber$1(value) === null)) {
      return "投影坐标原点偏移必须是有限数值。";
    }
  }
  return null;
}
const defaults$4 = {
  input: "",
  outputParent: "",
  name: "",
  format: "fbx",
  unit: "fromMetadata",
  axes: "fromMetadata",
  longitude: "",
  latitude: "",
  height: "",
  georeferenceMode: "local",
  sourceCrs: "",
  axisMapping: "eastNorthHeight",
  originX: "0",
  originY: "0",
  originZ: "0"
};
function inferredFormat(path) {
  return path.toLowerCase().endsWith(".obj") ? "obj" : "fbx";
}
function createOutputId$2() {
  return `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}
function ModelConvert() {
  const navigate = useNavigate();
  const [advancedOpen, setAdvancedOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState(defaults$4);
  const [outputId, setOutputId] = reactExports.useState(createOutputId$2);
  const [scan, setScan] = reactExports.useState(null);
  const [scannedTextureRoots, setScannedTextureRoots] = reactExports.useState([]);
  const [scanPending, setScanPending] = reactExports.useState(false);
  const [textureRoots, setTextureRoots] = reactExports.useState([]);
  const [detailsOpen, setDetailsOpen] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [capabilities, setCapabilities] = reactExports.useState(null);
  const input = useDebouncedValue(form.input, 500);
  const scanGate = {
    scannedPath: scan?.path ?? null,
    currentPath: form.input,
    debouncedPath: input,
    scannedTextureRoots,
    textureRoots,
    scanPending,
    scanValid: scan?.valid === true,
    scannedFormat: scan?.format,
    selectedFormat: form.format
  };
  const scanMatchesCurrentInput = modelScanMatchesCurrentInput(scanGate);
  const canSubmit = canSubmitModelScan(scanGate);
  const outputPath = buildModelOutputPath(form.input, form.outputParent, outputId);
  const outputError = modelOutputPathError(form.input, outputPath);
  const formError = modelConvertValidationError({
    ...form,
    output: outputPath,
    projectedGeoreferenceSupported: capabilities?.model?.projectedGeoreference === true
  });
  reactExports.useEffect(() => {
    const path = input.trim();
    if (!path) {
      setScan(null);
      setScannedTextureRoots([]);
      setScanPending(false);
      return;
    }
    let active = true;
    setScan(null);
    setScanPending(true);
    void api.scanModel(path, textureRoots).then((result) => {
      if (active) {
        setScan(result);
        setScannedTextureRoots(textureRoots);
      }
    }).catch((reason) => {
      if (active) {
        setScan(null);
        setScannedTextureRoots([]);
        setError(friendlyError(reason));
      }
    }).finally(() => {
      if (active) setScanPending(false);
    });
    return () => {
      active = false;
    };
  }, [input, textureRoots]);
  reactExports.useEffect(() => {
    void api.capabilities().then(setCapabilities).catch(() => setCapabilities(null));
  }, []);
  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "input") {
      setScan(null);
      setScanPending(Boolean(String(value).trim()));
      setError(null);
    }
    if (key === "outputParent") setError(null);
  }
  async function pickModelFile() {
    try {
      const path = await api.selectModelFile();
      if (!path) return;
      update("input", path);
      update("format", inferredFormat(path));
    } catch (reason) {
      setError(friendlyError(reason));
    }
  }
  async function addTextureRoot() {
    try {
      const path = await api.selectTextureRoot();
      if (path && !textureRoots.some((root) => pathsEqual(root, path))) {
        setTextureRoots((roots) => [...roots, path]);
      }
    } catch (reason) {
      setError(friendlyError(reason));
    }
  }
  async function pickOutputParent() {
    try {
      const path = await api.selectOutputDirectory();
      if (!path) return;
      update("outputParent", path);
      setOutputId(createOutputId$2());
    } catch (reason) {
      setError(friendlyError(reason));
    }
  }
  async function submit() {
    setError(null);
    if (capabilities?.model?.ready === false)
      return setError(capabilities.model.reason || "当前转换器不支持 FBX/OBJ 模型转换。");
    if (scanPending || !scanMatchesCurrentInput) return setError("请先等待当前模型文件预检完成。");
    if (scan && !scan.valid) return setError((scan.errors || []).join("；") || "模型预检未通过。");
    if (formError) return setError(formError);
    setSubmitting(true);
    try {
      const georeference2 = form.georeferenceMode === "anchor" ? {
        mode: "anchor",
        longitudeDeg: Number(form.longitude),
        latitudeDeg: Number(form.latitude),
        ellipsoidHeightM: Number(form.height)
      } : form.georeferenceMode === "projected" ? {
        mode: "projected",
        sourceCrs: form.sourceCrs.trim(),
        axisMapping: form.axisMapping,
        originOffset: [Number(form.originX), Number(form.originY), Number(form.originZ)]
      } : { mode: "local" };
      const result = await api.createTask({
        operation: "convert-model",
        input: { path: form.input.trim() },
        output: { path: outputPath },
        taskName: form.name || void 0,
        options: {
          model: {
            format: form.format,
            unit: form.unit,
            axes: form.axes,
            missingTexturePolicy: "error",
            textureRoots
          },
          georeference: georeference2,
          texture: { mode: "keep" },
          modelOutput: { format: "3dtiles-1.0", tiling: "single", lod: false }
        }
      });
      const id2 = result.task?.id || result.id;
      if (id2) navigate(`/processing?task=${encodeURIComponent(id2)}`);
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setSubmitting(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PageHeader,
      {
        title: "通用模型转换",
        description: "将 FBX / OBJ 转换为 3D Tiles。",
        actions: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", type: "button", onClick: () => setAdvancedOpen(true), children: "高级设置" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page-form", children: [
      error ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "error", children: error }) : null,
      capabilities?.model?.ready === false ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "warn", children: capabilities.model.reason || "当前转换器缺少模型转换能力，请更新运行组件。" }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormSection, { title: "数据", description: "选择 FBX 或 OBJ 文件。", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          PathField,
          {
            label: "模型文件",
            value: form.input,
            placeholder: "例如 D:\\\\models\\\\building.fbx",
            onChange: (value) => {
              update("input", value);
              update("format", inferredFormat(value));
            },
            onPick: isTauri() ? () => void pickModelFile() : void 0,
            pickLabel: "选择文件",
            feedback: scanPending ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "input-feedback", children: "正在扫描模型及其材质资源…" }) : scanMatchesCurrentInput && scan ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: scan.valid ? "input-feedback ok" : "input-feedback bad", children: scan.valid ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                "已识别 ",
                scan.format?.toUpperCase(),
                " 模型"
              ] }),
              scan.materials?.length ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "btn btn-ghost btn-sm",
                  type: "button",
                  onClick: () => setDetailsOpen((open) => !open),
                  children: detailsOpen ? "收起详情" : "资源详情"
                }
              ) : null
            ] }) : (scan.errors || []).join("；") }) : null
          }
        ),
        scan?.warnings?.map((warning2) => /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "warn", children: warning2 }, warning2)),
        detailsOpen && scan?.materials?.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "summary-box", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "MTL 文件" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: scan.summary?.materialLibraryCount ?? scan.materials.length }),
          scan.materials.map((material) => /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { className: "material-detail", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: material.reference }),
            " ·",
            " ",
            material.exists ? `${material.textures?.filter((texture) => texture.exists).length ?? 0} 个贴图可用` : "缺失",
            material.textures?.filter((texture) => !texture.exists).map((texture) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field-error", children: [
              "缺失贴图：",
              texture.reference
            ] }, texture.path))
          ] }, material.path))
        ] }) }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormSection, { title: "处理", description: "格式、单位与定位", columns: 3, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "model-format", children: "格式" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              id: "model-format",
              className: "select",
              value: form.format,
              onChange: (event) => update("format", event.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "fbx", children: "FBX" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "obj", children: "OBJ" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "model-unit", children: "单位" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              id: "model-unit",
              className: "select",
              value: form.unit,
              onChange: (event) => update("unit", event.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "fromMetadata", children: "从文件元数据读取" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "meters", children: "米" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "centimeters", children: "厘米" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "millimeters", children: "毫米" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "feet", children: "英尺" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "model-placement", children: "定位模式" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              id: "model-placement",
              className: "select",
              value: form.georeferenceMode,
              onChange: (event) => update("georeferenceMode", event.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "local", children: "保留本地坐标" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "anchor", children: "WGS84 锚点放置" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "option",
                  {
                    value: "projected",
                    disabled: capabilities?.model?.projectedGeoreference === false,
                    children: "已有投影坐标"
                  }
                )
              ]
            }
          )
        ] }),
        form.georeferenceMode === "anchor" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-grid cols-3 span-all", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "model-lon", children: "经度" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "model-lon",
                className: "input",
                placeholder: "经度",
                value: form.longitude,
                onChange: (event) => update("longitude", event.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "model-lat", children: "纬度" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "model-lat",
                className: "input",
                placeholder: "纬度",
                value: form.latitude,
                onChange: (event) => update("latitude", event.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "model-height", children: "椭球高（米）" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "model-height",
                className: "input",
                placeholder: "椭球高（米）",
                value: form.height,
                onChange: (event) => update("height", event.target.value)
              }
            )
          ] })
        ] }) : null,
        form.georeferenceMode === "projected" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-grid cols-2 span-all", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "model-crs", children: "源 CRS" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "model-crs",
                className: "input",
                placeholder: "EPSG:4547 或完整 WKT2",
                value: form.sourceCrs,
                onChange: (event) => update("sourceCrs", event.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "model-mapping", children: "源坐标轴" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                id: "model-mapping",
                className: "select",
                value: form.axisMapping,
                onChange: (event) => update("axisMapping", event.target.value),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "eastNorthHeight", children: "E / N / H" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "northEastHeight", children: "N / E / H" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field span-all", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "原点偏移" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  "aria-label": "原点偏移 X",
                  className: "input",
                  placeholder: "原点偏移 E/N 或 N/E",
                  value: form.originX,
                  onChange: (event) => update("originX", event.target.value)
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  "aria-label": "原点偏移 Y",
                  className: "input",
                  placeholder: "原点偏移 N/E 或 E/N",
                  value: form.originY,
                  onChange: (event) => update("originY", event.target.value)
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  "aria-label": "原点偏移 Z",
                  className: "input",
                  placeholder: "原点偏移 H",
                  value: form.originZ,
                  onChange: (event) => update("originZ", event.target.value)
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "span-all", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "warn", children: "投影转换会逐顶点重投影；请确认 CRS、轴顺序和原点偏移均与源模型一致。" }) })
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FormSection, { title: "输出", description: "自动生成新的成果目录。", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        PathField,
        {
          label: "保存位置（已有文件夹）",
          value: form.outputParent,
          onChange: (value) => update("outputParent", value),
          onPick: isTauri() ? () => void pickOutputParent() : void 0,
          pickLabel: "选择文件夹",
          error: outputError,
          hint: outputPath ? `将新建成果目录：${outputPath}。不会覆盖已有目录。` : "请选择保存位置，应用会在其中新建成果目录。"
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Drawer, { title: "高级设置", open: advancedOpen, onClose: () => setAdvancedOpen(false), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "model-axes", children: "轴向" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              id: "model-axes",
              className: "select",
              value: form.axes,
              onChange: (event) => update("axes", event.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "fromMetadata", children: "从文件元数据读取" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "yUpRightHanded", children: "右手 Y 向上" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "zUpRightHanded", children: "右手 Z 向上" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "drawer-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "外部贴图目录" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: "材质引用不在模型同目录时，添加包含贴图的目录。" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn",
              type: "button",
              onClick: () => void addTextureRoot(),
              disabled: !isTauri(),
              children: "添加目录"
            }
          ),
          textureRoots.map((root) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "texture-root", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { title: root, children: root }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn btn-ghost btn-sm",
                type: "button",
                onClick: () => setTextureRoots((roots) => roots.filter((item) => !pathsEqual(item, root))),
                children: "移除"
              }
            )
          ] }, root)),
          !isTauri() ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: "请在桌面应用中选择贴图目录。" }) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "model-name", children: "任务名" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "model-name",
              className: "input",
              placeholder: "可选，自动命名",
              value: form.name,
              onChange: (event) => update("name", event.target.value)
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SubmitBar,
        {
          onReset: () => {
            setForm(defaults$4);
            setOutputId(createOutputId$2());
            setScan(null);
            setScannedTextureRoots([]);
            setScanPending(false);
            setTextureRoots([]);
            setError(null);
          },
          primaryLabel: submitting ? "提交中…" : "开始转换",
          onPrimary: () => void submit(),
          primaryDisabled: submitting || scanPending || !canSubmit || Boolean(formError) || capabilities?.model?.ready === false,
          hint: formError || (scanPending ? "等待模型预检完成" : !canSubmit ? "选择模型并完成预检后即可转换" : "3D Tiles · 保留原纹理")
        }
      )
    ] })
  ] });
}
const IFC_OPTIONS_VERSION = 1;
const IFC_TILING_DEFAULTS = { maxFeaturesPerTile: 2e3, maxTrianglesPerTile: 25e4 };
const MAX_FEATURES_RANGE = [1, 1e6];
const MAX_TRIANGLES_RANGE = [1e3, 5e7];
const normalize = (path) => path.trim().replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
function buildIfcOutputPath(ifcFile, outputParent, outputId) {
  const fileName = ifcFile.trim().split(/[/\\]/).pop() || "";
  const parent = outputParent.trim();
  if (!fileName || !parent || !outputId) return "";
  const stem = fileName.replace(/\.ifc$/i, "");
  const separator = parent.includes("\\") ? "\\" : "/";
  return `${parent.replace(/[/\\]+$/, "")}${separator}${stem}_tiles_${outputId}`;
}
function ifcOutputPathError(ifcFile, output) {
  if (!ifcFile.trim() || !output.trim()) return null;
  const directory = normalize(ifcFile).replace(/\/[^/]+$/, "");
  const target = normalize(output);
  if (directory && (target === directory || target.startsWith(`${directory}/`))) {
    return "成果目录不能位于 IFC 文件所在目录内。请选择其他保存位置。";
  }
  if (target && directory.startsWith(`${target}/`)) {
    return "成果目录不能包含 IFC 文件所在目录。请选择其他保存位置。";
  }
  return null;
}
function parseIfcClassList(text) {
  const names = text.split(/[\s,，;；]+/).filter(Boolean);
  return [...new Map(names.map((name) => [name.toLowerCase(), name])).values()];
}
const IFC_CLASS = /^ifc[a-z0-9_]+$/i;
function finiteNumber(value) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function budget(value, fallback) {
  if (!value.trim()) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}
function outside(value, [low, high]) {
  return value === null || value < low || value > high;
}
function ifcConvertValidationError(form) {
  if (!form.input.trim() || !form.output.trim()) return "请选择 IFC 文件和保存位置。";
  if (!/\.ifc$/i.test(form.input.trim())) return "请选择扩展名为 .ifc 的文件。";
  const outputError = ifcOutputPathError(form.input, form.output);
  if (outputError) return outputError;
  if (form.georeferenceMode === "anchor") {
    const longitude = finiteNumber(form.longitude);
    const latitude = finiteNumber(form.latitude);
    const height = finiteNumber(form.height);
    if (longitude === null || latitude === null || height === null) {
      return "锚点定位需要有效的经度、纬度和椭球高数值。";
    }
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return "锚点经度范围为 -180 至 180，纬度范围为 -90 至 90。";
    }
  }
  if (form.georeferenceMode === "crs" && !form.sourceCrs.trim()) {
    return "指定 CRS 模式需要填写 CRS，例如 EPSG:4547。";
  }
  const include = parseIfcClassList(form.includeClasses);
  const exclude = parseIfcClassList(form.excludeClasses);
  const invalid = [...include, ...exclude].find((name) => !IFC_CLASS.test(name));
  if (invalid) return `“${invalid}”不是 IFC 类名，类名以 Ifc 开头，例如 IfcWall。`;
  const both = include.find((name) => exclude.some((other) => other.toLowerCase() === name.toLowerCase()));
  if (both) return `${both} 不能同时出现在“仅转换”和“排除”中。`;
  if (form.tilingMode === "adaptive") {
    if (outside(budget(form.maxFeaturesPerTile, IFC_TILING_DEFAULTS.maxFeaturesPerTile), MAX_FEATURES_RANGE)) {
      return "每个瓦片的构件数上限应为 1 至 1000000 的整数。";
    }
    if (outside(budget(form.maxTrianglesPerTile, IFC_TILING_DEFAULTS.maxTrianglesPerTile), MAX_TRIANGLES_RANGE)) {
      return "每个瓦片的三角形上限应为 1000 至 50000000 的整数。";
    }
  }
  return null;
}
function georeference(form) {
  if (form.georeferenceMode === "anchor") {
    return {
      mode: "anchor",
      longitudeDeg: Number(form.longitude),
      latitudeDeg: Number(form.latitude),
      ellipsoidHeightM: Number(form.height)
    };
  }
  if (form.georeferenceMode === "crs") return { mode: "crs", sourceCrs: form.sourceCrs.trim() };
  return { mode: form.georeferenceMode };
}
function buildIfcTaskOptions(form, execution) {
  const options = {
    version: IFC_OPTIONS_VERSION,
    georeference: georeference(form),
    includeClasses: parseIfcClassList(form.includeClasses),
    excludeClasses: parseIfcClassList(form.excludeClasses),
    dropEmptyColumns: !form.keepEmptyColumns,
    tiling: form.tilingMode === "single" ? { mode: "single" } : {
      mode: "adaptive",
      maxFeaturesPerTile: budget(form.maxFeaturesPerTile, IFC_TILING_DEFAULTS.maxFeaturesPerTile),
      maxTrianglesPerTile: budget(form.maxTrianglesPerTile, IFC_TILING_DEFAULTS.maxTrianglesPerTile)
    },
    quantizeGeometry: form.quantizeGeometry,
    writeGlobalIdIndex: form.writeGlobalIdIndex
  };
  if (execution?.resourceMode === "custom") {
    const custom = Object.fromEntries(
      ["cpuWorkers", "memoryBudgetMiB", "ioWorkers"].filter((key) => execution[key] !== void 0).map((key) => [key, execution[key]])
    );
    if (Object.keys(custom).length > 0) options.execution = custom;
  }
  return options;
}
const defaults$3 = {
  input: "",
  output: "",
  outputParent: "",
  name: "",
  georeferenceMode: "auto",
  longitude: "",
  latitude: "",
  height: "",
  sourceCrs: "",
  includeClasses: "",
  excludeClasses: "",
  keepEmptyColumns: false,
  tilingMode: "adaptive",
  maxFeaturesPerTile: "",
  maxTrianglesPerTile: "",
  quantizeGeometry: true,
  writeGlobalIdIndex: false
};
const georeferenceHints = {
  auto: "优先用文件里的 IfcMapConversion，其次用 IfcSite 经纬度，都没有时保留本地坐标。",
  local: "不做地理定位，预览时放在默认位置。",
  anchor: "把 IFC 项目原点放到指定经纬度，X 朝东、Y 朝北。",
  crs: "用指定 CRS 代替文件中的 CRS；没有 IfcMapConversion 时把坐标当作该 CRS 的东、北、高。"
};
function createOutputId$1() {
  return `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}
function IfcConvert() {
  const navigate = useNavigate();
  const [form, setForm] = reactExports.useState(defaults$3);
  const [outputId, setOutputId] = reactExports.useState(createOutputId$1);
  const [advancedOpen, setAdvancedOpen] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [capabilities, setCapabilities] = reactExports.useState(null);
  const [execution, setExecution] = reactExports.useState(null);
  const output = buildIfcOutputPath(form.input, form.outputParent, outputId);
  const formError = ifcConvertValidationError({ ...form, output });
  const toolMissing = capabilities?.ifc?.ready === false;
  reactExports.useEffect(() => {
    void api.capabilities().then(setCapabilities).catch(() => setCapabilities(null));
    void api.getSettings().then((settings) => setExecution(settings.execution || null)).catch(() => setExecution(null));
  }, []);
  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }
  async function pick(kind) {
    try {
      const path = kind === "input" ? await api.selectIfcFile() : await api.selectOutputDirectory();
      if (!path) return;
      update(kind, path);
      if (kind === "outputParent") setOutputId(createOutputId$1());
    } catch (reason) {
      setError(friendlyError(reason));
    }
  }
  async function submit() {
    setError(null);
    if (toolMissing) return setError(capabilities?.ifc?.reason || "找不到 IFC 转换组件。");
    if (formError) return setError(formError);
    setSubmitting(true);
    try {
      const result = await api.createTask({
        operation: "convert-ifc",
        input: { path: form.input.trim() },
        output: { path: output },
        taskName: form.name.trim() || void 0,
        options: buildIfcTaskOptions({ ...form, output }, execution)
      });
      const id2 = result.task?.id || result.id;
      if (id2) navigate(`/processing?task=${encodeURIComponent(id2)}`);
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setSubmitting(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PageHeader,
      {
        title: "IFC 转换",
        description: "将 IFC 建筑模型转换为带构件属性的 3D Tiles 1.1。",
        actions: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", type: "button", onClick: () => setAdvancedOpen(true), children: "高级设置" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page-form", children: [
      error ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "error", children: error }) : null,
      toolMissing ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "warn", children: capabilities?.ifc?.reason || "找不到 IFC 转换组件，请修复安装。" }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsx(FormSection, { title: "数据", description: "已用 IFC2X3 和 IFC4 样例验证。", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        PathField,
        {
          label: "IFC 文件",
          value: form.input,
          placeholder: "例如 D:\\\\bim\\\\building.ifc",
          onChange: (value) => update("input", value),
          onPick: isTauri() ? () => void pick("input") : void 0,
          pickLabel: "选择文件"
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormSection, { title: "定位", description: georeferenceHints[form.georeferenceMode], columns: 3, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "ifc-georef", children: "定位模式" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              id: "ifc-georef",
              className: "select",
              value: form.georeferenceMode,
              onChange: (event) => update("georeferenceMode", event.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "auto", children: "自动（读取文件定位）" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "local", children: "保留本地坐标" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "anchor", children: "WGS84 锚点放置" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "crs", children: "指定 CRS" })
              ]
            }
          )
        ] }),
        form.georeferenceMode === "anchor" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-grid cols-3 span-all", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "ifc-lon", children: "经度" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "ifc-lon",
                className: "input",
                placeholder: "经度",
                value: form.longitude,
                onChange: (event) => update("longitude", event.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "ifc-lat", children: "纬度" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "ifc-lat",
                className: "input",
                placeholder: "纬度",
                value: form.latitude,
                onChange: (event) => update("latitude", event.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "ifc-height", children: "椭球高（米）" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "ifc-height",
                className: "input",
                placeholder: "椭球高（米）",
                value: form.height,
                onChange: (event) => update("height", event.target.value)
              }
            )
          ] })
        ] }) : null,
        form.georeferenceMode === "crs" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field span-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "ifc-crs", children: "CRS" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "ifc-crs",
              className: "input",
              placeholder: "EPSG:4547",
              value: form.sourceCrs,
              onChange: (event) => update("sourceCrs", event.target.value)
            }
          )
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FormSection, { title: "输出", description: "自动生成新的成果目录。", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        PathField,
        {
          label: "保存位置（已有文件夹）",
          value: form.outputParent,
          onChange: (value) => update("outputParent", value),
          onPick: isTauri() ? () => void pick("outputParent") : void 0,
          pickLabel: "选择文件夹",
          error: ifcOutputPathError(form.input, output),
          hint: output ? `将新建成果目录：${output}。不会覆盖已有目录。` : "请选择保存位置，应用会在其中新建成果目录。"
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Drawer, { title: "高级设置", open: advancedOpen, onClose: () => setAdvancedOpen(false), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "drawer-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "构件过滤" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: "多个类名用逗号或空格分隔；子类一并生效，例如 IfcWall 包含 IfcWallStandardCase。" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "ifc-include", children: "仅转换这些类" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "ifc-include",
                className: "input",
                placeholder: "留空表示全部，例如 IfcWall, IfcSlab",
                value: form.includeClasses,
                onChange: (event) => update("includeClasses", event.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "ifc-exclude", children: "排除这些类" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "ifc-exclude",
                className: "input",
                placeholder: "例如 IfcFurnishingElement",
                value: form.excludeClasses,
                onChange: (event) => update("excludeClasses", event.target.value)
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "drawer-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "分块" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "ifc-tiling", children: "分块方式" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                id: "ifc-tiling",
                className: "select",
                value: form.tilingMode,
                onChange: (event) => update("tilingMode", event.target.value),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "adaptive", children: "按大小和位置分块" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "single", children: "单个瓦片" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: form.tilingMode === "adaptive" ? "构件整件放进一个瓦片，大构件在上层先显示，小构件在下层靠近后加载。模型没超过上限时仍是一个瓦片。" : "所有构件放进一个瓦片，适合小模型；大模型会很慢甚至无法加载。" }),
          form.tilingMode === "adaptive" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "ifc-max-features", children: "每个瓦片最多构件数" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  id: "ifc-max-features",
                  className: "input",
                  type: "number",
                  min: 1,
                  step: 1,
                  placeholder: String(IFC_TILING_DEFAULTS.maxFeaturesPerTile),
                  value: form.maxFeaturesPerTile,
                  onChange: (event) => update("maxFeaturesPerTile", event.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "ifc-max-triangles", children: "每个瓦片最多三角形数" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  id: "ifc-max-triangles",
                  className: "input",
                  type: "number",
                  min: 1e3,
                  step: 1e3,
                  placeholder: String(IFC_TILING_DEFAULTS.maxTrianglesPerTile),
                  value: form.maxTrianglesPerTile,
                  onChange: (event) => update("maxTrianglesPerTile", event.target.value)
                }
              )
            ] })
          ] }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              id: "ifc-quantize",
              checked: form.quantizeGeometry,
              onChange: (checked) => update("quantizeGeometry", checked),
              children: "压缩坐标和法线"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: "用 KHR_mesh_quantization 存 16 位坐标、8 位法线，几何数据约小一半；误差不超过瓦片最长边的 1/65535。" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              id: "ifc-index",
              checked: form.writeGlobalIdIndex,
              onChange: (checked) => update("writeGlobalIdIndex", checked),
              children: "输出 GlobalId 索引"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: "另写 index.json，记录每个 GlobalId 所在的瓦片和要素编号，供外部系统查找构件。" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "drawer-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "属性表" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              id: "ifc-keep-empty",
              checked: form.keepEmptyColumns,
              onChange: (checked) => update("keepEmptyColumns", checked),
              children: "保留全为空的属性列"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: "保留时这些属性只出现在属性定义里，不占数据空间。" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "ifc-name", children: "任务名" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "ifc-name",
              className: "input",
              placeholder: "可选，自动命名",
              value: form.name,
              onChange: (event) => update("name", event.target.value)
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SubmitBar,
        {
          onReset: () => {
            setForm(defaults$3);
            setOutputId(createOutputId$1());
            setError(null);
          },
          primaryLabel: submitting ? "提交中…" : "开始转换",
          onPrimary: () => void submit(),
          primaryDisabled: submitting || Boolean(formError) || toolMissing,
          hint: formError || "3D Tiles 1.1 · 每个构件一个要素，属性写入 EXT_structural_metadata"
        }
      )
    ] })
  ] });
}
const defaults$2 = { ...emptyTerrainForm(), outputParent: "", name: "" };
function createOutputId() {
  return `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}
function initialForm(params) {
  return { ...defaults$2, sources: addTerrainSources([], params.getAll("input")) };
}
function TerrainTile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = reactExports.useState(() => initialForm(searchParams));
  const [outputId, setOutputId] = reactExports.useState(createOutputId);
  const [advancedOpen, setAdvancedOpen] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [capabilities, setCapabilities] = reactExports.useState(null);
  const [execution, setExecution] = reactExports.useState(null);
  const [crsDraft, setCrsDraft] = reactExports.useState("");
  const [inspection, setInspection] = reactExports.useState(null);
  const [inspecting, setInspecting] = reactExports.useState(false);
  const [inspectError, setInspectError] = reactExports.useState(null);
  const inspectRequest = reactExports.useRef(0);
  const [inspectNonce, setInspectNonce] = reactExports.useState(0);
  const output = buildTerrainOutputPath(form.sources[0] || "", form.outputParent, outputId);
  const runtimeMissing = capabilities?.terrain?.ready === false;
  const blockers = terrainBlockers({ ...form, output }, inspection, inspecting);
  const plan = inspection?.plan || null;
  const holes = terrainSourceHoles(inspection);
  reactExports.useEffect(() => {
    void api.capabilities().then(setCapabilities).catch(() => setCapabilities(null));
    void api.getSettings().then((settings) => setExecution(settings.execution || null)).catch(() => setExecution(null));
  }, []);
  reactExports.useEffect(() => {
    if (form.sources.length === 0 || !isTauri()) {
      setInspection(null);
      setInspecting(false);
      return;
    }
    const request2 = ++inspectRequest.current;
    setInspecting(true);
    setInspectError(null);
    void api.inspectTerrain({
      paths: form.sources,
      crsOverride: form.crsOverride || null,
      acceptBallpark: form.acceptBallpark,
      projectionMode: form.projectionMode
    }).then((result) => {
      if (request2 === inspectRequest.current) setInspection(result);
    }).catch((reason) => {
      if (request2 !== inspectRequest.current) return;
      setInspection(null);
      setInspectError(friendlyError(reason));
    }).finally(() => {
      if (request2 === inspectRequest.current) setInspecting(false);
    });
  }, [form.sources, form.crsOverride, form.acceptBallpark, form.projectionMode, inspectNonce]);
  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }
  async function cancelInspect() {
    inspectRequest.current += 1;
    setInspecting(false);
    setInspection(null);
    setInspectError("已取消 DEM 检查。点击“重新检查”或修改源文件后会再次检查。");
    await api.cancelTerrainInspect().catch(() => void 0);
  }
  async function pickSources() {
    try {
      const picked = await api.selectTerrainFiles();
      if (picked.length) update("sources", addTerrainSources(form.sources, picked));
    } catch (reason) {
      setError(friendlyError(reason));
    }
  }
  async function pickOutput() {
    try {
      const path = await api.selectOutputDirectory();
      if (!path) return;
      update("outputParent", path);
      setOutputId(createOutputId());
    } catch (reason) {
      setError(friendlyError(reason));
    }
  }
  function importWkt(file) {
    if (!file) return;
    void file.text().then((text) => setCrsDraft(text.trim()));
  }
  async function submit() {
    setError(null);
    if (runtimeMissing) return setError(capabilities?.terrain?.reason || "找不到地形组件，请修复安装。");
    if (blockers.length) return setError(blockers[0]);
    setSubmitting(true);
    try {
      const result = await api.createTask({
        operation: "convert-terrain",
        input: { path: form.sources[0].trim() },
        output: { path: output },
        taskName: form.name.trim() || void 0,
        options: buildTerrainTaskOptions({ ...form, output }, inspection, execution)
      });
      const id2 = result.task?.id || result.id;
      if (id2) navigate(`/processing?task=${encodeURIComponent(id2)}`);
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setSubmitting(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PageHeader,
      {
        title: "地形切片",
        description: "将 DEM 切成 Cesium quantized-mesh 地形（layer.json + .terrain）。",
        actions: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", type: "button", onClick: () => setAdvancedOpen(true), children: "高级设置" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page-form", children: [
      error ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "error", children: error }) : null,
      runtimeMissing ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "warn", children: capabilities?.terrain?.reason || "找不到地形组件，请修复安装。" }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormSection, { title: "数据", description: "支持 GeoTIFF/BigTIFF、ASC 与 VRT，可一次添加多个相邻或重叠的文件；重叠处以列表中靠后的文件为准。", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "actions", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", type: "button", onClick: () => void pickSources(), disabled: !isTauri(), children: "添加 DEM 文件" }),
          form.sources.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-ghost", type: "button", onClick: () => update("sources", []), children: "清空" }) : null,
          inspecting ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "muted", role: "status", children: "正在检查 DEM…" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-ghost", type: "button", onClick: () => void cancelInspect(), children: "取消检查" })
          ] }) : null,
          !inspecting && form.sources.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-ghost", type: "button", onClick: () => setInspectNonce((nonce) => nonce + 1), children: "重新检查" }) : null
        ] }) }),
        inspectError ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "warn", children: inspectError }) : null,
        form.sources.length ? /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table terrain-sources", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "文件" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "格式与尺寸" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "坐标系" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "范围（WGS 84）" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "NoData" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: form.sources.map((path, index2) => {
            const source = inspection?.sources[index2];
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { wordBreak: "break-all" }, children: path }),
              source?.error ? /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { colSpan: 4, className: "terrain-source-error", children: [
                terrainMessage(source.error.message),
                "（",
                source.error.code,
                "）"
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: source?.driver ? `${source.driver} · ${source.dataType} · ${describePixel(source)}` : "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: source?.crs ? describeCrs(source.crs) : "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: describeBounds(source?.bounds?.wgs84) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: source?.noData ? describeNoData(source) : "—" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "btn btn-ghost btn-sm",
                  type: "button",
                  "aria-label": `移除 ${path}`,
                  onClick: () => update("sources", form.sources.filter((_, other) => other !== index2)),
                  children: "移除"
                }
              ) })
            ] }, path);
          }) })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: "尚未添加 DEM 文件。" }),
        plan ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "field-hint terrain-plan", children: [
          "处理方式：",
          describeRoute(plan.route, plan.routeReason),
          "；推荐最大层级 ",
          plan.recommendedMaxDepth,
          "（源像元约 ",
          plan.pixelGroundMetres.toFixed(2),
          " m）；合并范围 ",
          describeBounds(plan.wgs84Bounds),
          "。"
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormSection, { title: "坐标系", description: "只说明源文件中的坐标是什么含义，不会改动像元坐标。留空时使用文件自带的坐标系。", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "terrain-crs", children: "指定源坐标系" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "textarea",
            {
              id: "terrain-crs",
              className: "input",
              rows: form.crsOverride || crsDraft.length > 60 ? 4 : 1,
              placeholder: "例如 EPSG:4547，或粘贴 WKT",
              value: crsDraft,
              onChange: (event) => setCrsDraft(event.target.value)
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "actions", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn btn-sm",
                type: "button",
                disabled: crsDraft.trim() === form.crsOverride,
                onClick: () => update("crsOverride", crsDraft.trim()),
                children: "应用"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "btn btn-sm btn-ghost", children: [
              "导入 WKT/PRJ 文件",
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "file",
                  accept: ".prj,.wkt,.txt",
                  hidden: true,
                  "aria-label": "导入 WKT 文件",
                  onChange: (event) => importWkt(event.target.files?.[0])
                }
              )
            ] }),
            form.crsOverride ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm btn-ghost", type: "button", onClick: () => {
              setCrsDraft("");
              update("crsOverride", "");
            }, children: "改回文件坐标系" }) : null
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: plan ? `生效坐标系：${describeCrs(plan.crs)}${plan.crs.conversionMethod ? ` · 投影方法 ${String(plan.crs.conversionMethod)}` : ""}${form.crsOverride ? "（用户指定，应用于全部源文件）" : ""}。` : "检查通过后显示生效坐标系的全称、投影分带与单位。" })
        ] }),
        lowAccuracyTransform(inspection) || form.acceptBallpark ? /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { id: "terrain-ballpark", checked: form.acceptBallpark, onChange: (checked) => update("acceptBallpark", checked), children: "接受精度未知的坐标变换（不做基准转换，平面误差未知，可能达数十米以上）" }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormSection, { title: "高程", description: "高程值按原样写入，不做任何垂直基准转换，也不会自动套用 EGM96。", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "field-hint", children: [
          "源文件声明的垂直基准：",
          describeVertical(plan?.verticalName)
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "terrain-vertical", children: "源高程的含义" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              id: "terrain-vertical",
              className: "select",
              value: form.verticalMode,
              onChange: (event) => update("verticalMode", event.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "请选择" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "ellipsoidal", children: "椭球高（与 Cesium 一致）" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "orthometric-known", children: "正高/正常高（已知基准，如 1985 国家高程基准）" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "unknown", children: "不清楚" })
              ]
            }
          )
        ] }),
        form.verticalMode && form.verticalMode !== "ellipsoidal" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Switch,
          {
            id: "terrain-vertical-ack",
            checked: form.verticalAcknowledged,
            onChange: (checked) => update("verticalAcknowledged", checked),
            children: "我知道高程将按原值写入；在 Cesium 中与椭球高相差一个大地水准面差距（国内可达数十米）"
          }
        ) : null
      ] }),
      inspection?.valid && noDataPolicyNeeded(inspection) ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        FormSection,
        {
          title: "NoData 空洞",
          description: holes === void 0 ? "源数据声明了 NoData，但空洞数未统计（文件较大）。请选择处理方式；没有空洞时不会改动数据。" : `源数据中有 ${holes.toLocaleString("zh-CN")} 个 NoData 像元，需要决定如何处理。`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "terrain-nodata", children: "处理方式" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  id: "terrain-nodata",
                  className: "select",
                  value: form.noDataMode,
                  onChange: (event) => update("noDataMode", event.target.value),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "请选择" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "interpolate", children: "由周边高程插值" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "explicit-constant", children: "填充固定高程" })
                  ]
                }
              )
            ] }),
            form.noDataMode === "interpolate" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "terrain-search", children: "最大搜索半径（像元）" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  id: "terrain-search",
                  className: "input",
                  type: "number",
                  min: 1,
                  max: 1e3,
                  value: form.maxSearchPixels,
                  onChange: (event) => update("maxSearchPixels", event.target.value)
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: "插值结果是推测值，不是实测高程。离有效数据超过该半径的空洞会让任务失败，而不是被随意填补。" })
            ] }) : null,
            form.noDataMode === "explicit-constant" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "terrain-fill", children: "填充高程（米）" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  id: "terrain-fill",
                  className: "input",
                  placeholder: "例如 0",
                  value: form.noDataValue,
                  onChange: (event) => update("noDataValue", event.target.value)
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: "0 m 是合法高程，会被当作真实地面写入。空洞较大时会出现明显的平台或陡坎。" })
            ] }) : null
          ]
        }
      ) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormSection, { title: "切片", columns: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "terrain-depth", children: "最大层级" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "terrain-depth",
              className: "input",
              type: "number",
              min: 0,
              max: TERRAIN_MAX_DEPTH,
              placeholder: plan ? `自动（推荐 ${plan.recommendedMaxDepth}）` : "自动",
              value: form.maxDepth,
              onChange: (event) => update("maxDepth", event.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "terrain-quality", children: "网格质量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              id: "terrain-quality",
              className: "select",
              value: form.meshQuality,
              onChange: (event) => update("meshQuality", event.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "balanced", children: "均衡" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "high", children: "高（三角形更多，文件更大）" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FormSection, { title: "输出", description: "自动生成新的成果目录，内含 layer.json 和 geoforge-terrain.json 报告。", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        PathField,
        {
          label: "保存位置（已有文件夹）",
          value: form.outputParent,
          onChange: (value) => update("outputParent", value),
          onPick: isTauri() ? () => void pickOutput() : void 0,
          pickLabel: "选择文件夹",
          error: terrainOutputPathError(form.sources, output),
          hint: output ? `将新建成果目录：${output}。不会覆盖已有目录。` : "请选择保存位置，应用会在其中新建成果目录。"
        }
      ) }),
      blockers.length ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "info", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "terrain-blockers", "aria-label": "尚未满足的条件", children: blockers.map((blocker) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        "· ",
        blocker
      ] }, blocker)) }) }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Drawer, { title: "高级设置", open: advancedOpen, onClose: () => setAdvancedOpen(false), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "drawer-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "预处理" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "terrain-projection", children: "投影处理" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                id: "terrain-projection",
                className: "select",
                value: form.projectionMode,
                onChange: (event) => update("projectionMode", event.target.value),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "auto", children: "自动（非 WGS 84 经纬度先重投影）" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "normalize", children: "总是先重投影到 WGS 84" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "direct", children: "尽量直接切片（仅已验证的投影方法）" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: "D1 样例上先重投影耗时约为直接切片的四分之一，误差相当，因此默认先重投影。" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              id: "terrain-overview",
              checked: form.overview === "auto",
              onChange: (checked) => update("overview", checked ? "auto" : "off"),
              children: "缺少金字塔时自动生成"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { id: "terrain-normals", checked: form.normals, onChange: (checked) => update("normals", checked), children: "输出顶点法线（Cesium 光照）" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "drawer-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "资源" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: execution?.resourceMode === "custom" ? `使用设置中的自定义资源：CPU 线程 ${execution.cpuWorkers ?? "自动"}，内存 ${execution.memoryBudgetMiB ?? "自动"} MiB。` : "使用设置中的自动资源分配。线程与内存请在“设置”页修改。" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "terrain-name", children: "任务名" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "terrain-name",
              className: "input",
              placeholder: "可选，自动命名",
              value: form.name,
              onChange: (event) => update("name", event.target.value)
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SubmitBar,
        {
          onReset: () => {
            setForm(defaults$2);
            setCrsDraft("");
            setOutputId(createOutputId());
            setError(null);
          },
          primaryLabel: submitting ? "提交中…" : "开始切片",
          onPrimary: () => void submit(),
          primaryDisabled: submitting || blockers.length > 0 || runtimeMissing,
          hint: blockers[0] || "quantized-mesh 1.0 · 地理格网（EPSG:4326 TMS）"
        }
      )
    ] })
  ] });
}
const MAX_MERGE_INPUTS = 64;
function normalizedPath(path) {
  return path.trim().replace(/\\/g, "/").replace(/\/+$/, "").replace(/\/tileset\.json$/i, "").toLowerCase();
}
function validateMergeForm(form) {
  if (form.inputs.length < 2 || form.inputs.length > MAX_MERGE_INPUTS) return "请选择 2 到 64 份 Tileset。";
  if (form.inputs.some((path) => !path.trim())) return "请填写每份 Tileset 的路径。";
  const paths = form.inputs.map(normalizedPath);
  if (new Set(paths).size !== paths.length) return "输入列表包含重复的 Tileset。";
  if (!form.output.trim()) return "请填写成果目录。";
  const output = normalizedPath(form.output);
  if (paths.some((input) => output === input || output.startsWith(`${input}/`) || input.startsWith(`${output}/`))) {
    return "成果目录不能与任何输入目录重叠。";
  }
  return null;
}
function mergeTaskRequest(form) {
  return {
    operation: "merge-tilesets",
    input: { path: form.inputs[0].trim() },
    output: { path: form.output.trim() },
    taskName: form.name.trim() || void 0,
    options: { merge: { additionalInputs: form.inputs.slice(1).map((path) => path.trim()) } }
  };
}
const CONFIG_KEY$1 = "geoforge.tiles.merge.config";
const defaults$1 = { inputs: ["", ""], output: "", name: "" };
function loadConfig$1() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG_KEY$1) || "null");
    if (saved && typeof saved === "object") {
      const form = saved;
      if (Array.isArray(form.inputs) && form.inputs.length >= 2 && form.inputs.length <= MAX_MERGE_INPUTS && form.inputs.every((p2) => typeof p2 === "string")) {
        return {
          inputs: form.inputs,
          output: typeof form.output === "string" ? form.output : "",
          name: typeof form.name === "string" ? form.name : ""
        };
      }
    }
  } catch {
  }
  return defaults$1;
}
function MergeTiles() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [advancedOpen, setAdvancedOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState(loadConfig$1);
  const [error, setError] = reactExports.useState(null);
  const [taskId, setTaskId] = reactExports.useState(null);
  const [submitting, setSubmitting] = reactExports.useState(false);
  reactExports.useEffect(() => {
    try {
      localStorage.setItem(CONFIG_KEY$1, JSON.stringify(form));
    } catch {
    }
  }, [form]);
  reactExports.useEffect(() => {
    const inputs = params.getAll("input");
    if (inputs.length >= 2)
      setForm({ inputs, output: params.get("output") || "", name: params.get("name") || "" });
  }, [params]);
  function updateInput(index2, path) {
    setForm((current) => ({
      ...current,
      inputs: current.inputs.map((p2, i2) => i2 === index2 ? path : p2)
    }));
    setError(null);
    setTaskId(null);
  }
  async function pickInput(index2) {
    try {
      const path = await api.selectTilesetFile();
      if (path) updateInput(index2, path);
    } catch (e2) {
      setError(friendlyError(e2));
    }
  }
  async function pickOutput() {
    try {
      const parent = await api.selectOutputDirectory();
      if (parent)
        setForm((current) => ({
          ...current,
          output: suggestOutputPath("merged", parent, "_tiles")
        }));
    } catch (e2) {
      setError(friendlyError(e2));
    }
  }
  async function submit() {
    const problem = validateMergeForm(form);
    setError(problem);
    setTaskId(null);
    if (problem) return;
    setSubmitting(true);
    try {
      const response = await api.createTask(mergeTaskRequest(form));
      const id2 = response.id || response.task?.id;
      if (!id2) throw new Error("后端未返回任务编号，请检查处理记录。");
      setTaskId(id2);
      navigate(`/processing?task=${encodeURIComponent(id2)}`);
    } catch (e2) {
      setError(friendlyError(e2));
    } finally {
      setSubmitting(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PageHeader,
      {
        title: "3D Tiles 合并",
        description: "将多份本地 Tileset 汇总为可独立移动的成果。",
        actions: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", type: "button", onClick: () => setAdvancedOpen(true), children: "高级设置" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "tool-form", children: [
      error ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "error", children: error }) : null,
      taskId ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { kind: "success", children: [
        "合并任务已创建。",
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: `/processing?task=${encodeURIComponent(taskId)}`, children: "查看任务" })
      ] }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormSection, { title: "数据", description: "选择至少两份 Tileset。", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: "输入应使用同一坐标参考系；合并保留原坐标，不自动定位或转换坐标系。支持本地显式 Tileset，源目录中的资源将一并复制。" }),
        form.inputs.map((path, index2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: `merge-input-${index2}`, children: [
            "Tileset ",
            index2 + 1
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: `merge-input-${index2}`,
                className: "input",
                value: path,
                placeholder: "目录或 tileset.json 路径",
                disabled: submitting,
                onChange: (e2) => updateInput(index2, e2.target.value)
              }
            ),
            isTauri() ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn",
                type: "button",
                disabled: submitting,
                onClick: () => void pickInput(index2),
                children: "选择文件"
              }
            ) : null,
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn",
                type: "button",
                "aria-label": `移除 Tileset ${index2 + 1}`,
                disabled: submitting || form.inputs.length <= 2,
                onClick: () => setForm((current) => ({
                  ...current,
                  inputs: current.inputs.filter((_, i2) => i2 !== index2)
                })),
                children: "移除"
              }
            )
          ] })
        ] }, index2)),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn",
            type: "button",
            disabled: submitting || form.inputs.length >= MAX_MERGE_INPUTS,
            onClick: () => setForm((current) => ({ ...current, inputs: [...current.inputs, ""] })),
            children: "添加 Tileset"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FormSection, { title: "输出", description: "新建独立成果目录。", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "merge-output", children: "成果目录" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "merge-output",
              className: "input",
              value: form.output,
              disabled: submitting,
              onChange: (e2) => setForm({ ...form, output: e2.target.value })
            }
          ),
          isTauri() ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn",
              type: "button",
              disabled: submitting,
              onClick: () => void pickOutput(),
              children: "选择父目录"
            }
          ) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: "请选择尚不存在的目录；复制的模型、纹理和原有层级保留在各自子目录中。" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Drawer, { title: "高级设置", open: advancedOpen, onClose: () => setAdvancedOpen(false), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "merge-name", children: "任务名" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            id: "merge-name",
            className: "input",
            value: form.name,
            disabled: submitting,
            onChange: (e2) => setForm({ ...form, name: e2.target.value }),
            placeholder: "可选"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SubmitBar,
        {
          primaryLabel: submitting ? "提交中…" : "开始合并",
          primaryDisabled: submitting,
          onPrimary: () => void submit(),
          onReset: () => {
            setForm(defaults$1);
            setError(null);
            setTaskId(null);
          }
        }
      )
    ] })
  ] });
}
const CONFIG_KEY = "geoforge.tiles.clip.config";
const defaults = {
  input: "",
  output: "",
  name: "",
  mode: "rectangle",
  bounds: ["", "", "", ""],
  geojson: ""
};
function loadConfig() {
  try {
    const value = JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
    if (value && ["input", "output", "name", "geojson"].every((k2) => typeof value[k2] === "string") && ["rectangle", "polygon"].includes(value.mode) && Array.isArray(value.bounds) && value.bounds.length === 4 && value.bounds.every((b) => typeof b === "string"))
      return value;
  } catch {
  }
  return defaults;
}
function ClipTiles() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [advancedOpen, setAdvancedOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState(loadConfig);
  const [error, setError] = reactExports.useState(null);
  const [taskId, setTaskId] = reactExports.useState(null);
  const [submitting, setSubmitting] = reactExports.useState(false);
  reactExports.useEffect(() => {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(form));
    } catch {
    }
  }, [form]);
  reactExports.useEffect(() => {
    if (!params.get("input")) return;
    try {
      const region = params.get("region");
      setForm({
        ...defaults,
        input: params.get("input") || "",
        output: params.get("output") || "",
        name: params.get("name") || "",
        ...region ? restoreClipRegion(JSON.parse(region)) : {}
      });
    } catch {
      setError("重新处理的区域参数无效，请重新填写。");
    }
  }, [params]);
  function update(patch) {
    setForm((current) => ({ ...current, ...patch }));
    setError(null);
    setTaskId(null);
  }
  async function submit() {
    setError(null);
    setTaskId(null);
    try {
      const request2 = clipTaskRequest(form);
      setSubmitting(true);
      const response = await api.createTask(request2);
      const id2 = response.id || response.task?.id;
      if (!id2) throw new Error("后端未返回任务编号，请检查处理记录。");
      setTaskId(id2);
      navigate(`/processing?task=${encodeURIComponent(id2)}`);
    } catch (e2) {
      setError(friendlyError(e2));
    } finally {
      setSubmitting(false);
    }
  }
  async function pick(output) {
    try {
      const path = output ? await api.selectOutputDirectory() : await api.selectTilesetFile();
      if (path)
        update(output ? { output: suggestOutputPath("clipped", path, "_tiles") } : { input: path });
    } catch (e2) {
      setError(friendlyError(e2));
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PageHeader,
      {
        title: "3D Tiles 范围裁剪",
        description: "保留指定区域内的几何，生成独立成果。",
        actions: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", type: "button", onClick: () => setAdvancedOpen(true), children: "高级设置" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "tool-form", children: [
      error ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { kind: "error", children: error }) : null,
      taskId ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { kind: "success", children: [
        "裁剪任务已创建。",
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: `/processing?task=${encodeURIComponent(taskId)}`, children: "查看任务" })
      ] }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormSection, { title: "数据", description: "选择有地理定位的数据。", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "clip-input", children: "Tileset 路径" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "clip-input",
                className: "input",
                disabled: submitting,
                value: form.input,
                onChange: (e2) => update({ input: e2.target.value }),
                placeholder: "目录或 tileset.json"
              }
            ),
            isTauri() ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "btn",
                disabled: submitting,
                onClick: () => void pick(false),
                children: "选择文件"
              }
            ) : null
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: "支持已有 ECEF 地理定位的显式静态 GLB / 无批次 B3DM 网格。保留纹理、材质、UV 与法线，不自动封口。动画、实例化、压缩网格和批次属性暂不支持。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormSection, { title: "保留区域", description: "WGS84 经纬度", columns: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field span-all", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "clip-mode", children: "区域输入方式" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              id: "clip-mode",
              className: "input",
              value: form.mode,
              disabled: submitting,
              onChange: (e2) => update({ mode: e2.target.value }),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "rectangle", children: "经纬度矩形" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "polygon", children: "多边形 GeoJSON" })
              ]
            }
          )
        ] }),
        form.mode === "rectangle" ? ["西经度", "南纬度", "东经度", "北纬度"].map((label, i2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: `clip-bound-${i2}`, children: [
            label,
            "（度）"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: `clip-bound-${i2}`,
              className: "input",
              type: "number",
              step: "any",
              disabled: submitting,
              value: form.bounds[i2],
              onChange: (e2) => update({ bounds: form.bounds.map((v2, n2) => n2 === i2 ? e2.target.value : v2) })
            }
          )
        ] }, label)) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field span-all", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "clip-geojson", children: "GeoJSON 区域" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "textarea",
              {
                id: "clip-geojson",
                className: "textarea",
                rows: 10,
                disabled: submitting,
                value: form.geojson,
                onChange: (e2) => update({ geojson: e2.target.value }),
                placeholder: '{"type":"Polygon","coordinates":[[[经度,纬度],…]]}'
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field span-all", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "clip-import", children: "导入 GeoJSON 文件" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "clip-import",
                type: "file",
                accept: ".json,.geojson,application/json",
                disabled: submitting,
                onChange: (e2) => {
                  const file = e2.target.files?.[0];
                  if (file)
                    void file.text().then((geojson) => update({ geojson })).catch((e22) => setError(friendlyError(e22)));
                }
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint span-all", children: "WGS84 经纬度，多边形须闭合且无孔洞。区域距中心不超过 10 公里，纬度在 ±80° 内，不跨日期变更线。边界按局部 ENU 竖直平面裁剪，不限制高度。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FormSection, { title: "输出", description: "新建独立成果目录。", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "clip-output", children: "成果目录" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "clip-output",
              className: "input",
              disabled: submitting,
              value: form.output,
              onChange: (e2) => update({ output: e2.target.value })
            }
          ),
          isTauri() ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn",
              disabled: submitting,
              onClick: () => void pick(true),
              children: "选择父目录"
            }
          ) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "field-hint", children: "成果目录须尚不存在且不与输入重叠；空结果会报告失败并清理临时文件。" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Drawer, { title: "高级设置", open: advancedOpen, onClose: () => setAdvancedOpen(false), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "clip-name", children: "任务名" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            id: "clip-name",
            className: "input",
            disabled: submitting,
            value: form.name,
            onChange: (e2) => update({ name: e2.target.value }),
            placeholder: "可选"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SubmitBar,
        {
          primaryLabel: submitting ? "提交中…" : "开始裁剪",
          primaryDisabled: submitting,
          onPrimary: () => void submit(),
          onReset: () => update(defaults)
        }
      )
    ] })
  ] });
}
function App() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Routes, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Route, { element: /* @__PURE__ */ jsxRuntimeExports.jsx(AppLayout, {}), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { index: true, element: /* @__PURE__ */ jsxRuntimeExports.jsx(Workspace, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "osgb/convert", element: /* @__PURE__ */ jsxRuntimeExports.jsx(OsgbConvert, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "model/convert", element: /* @__PURE__ */ jsxRuntimeExports.jsx(ModelConvert, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "ifc/convert", element: /* @__PURE__ */ jsxRuntimeExports.jsx(IfcConvert, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "terrain/tile", element: /* @__PURE__ */ jsxRuntimeExports.jsx(TerrainTile, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "processing", element: /* @__PURE__ */ jsxRuntimeExports.jsx(Processing, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "preview/tiles", element: /* @__PURE__ */ jsxRuntimeExports.jsx(TilesPreview, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "preview/terrain", element: /* @__PURE__ */ jsxRuntimeExports.jsx(TerrainPreview, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "history", element: /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: "/processing", replace: true }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "results", element: /* @__PURE__ */ jsxRuntimeExports.jsx(Results, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "tiles/process", element: /* @__PURE__ */ jsxRuntimeExports.jsx(ProcessTiles, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "tiles/merge", element: /* @__PURE__ */ jsxRuntimeExports.jsx(MergeTiles, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "tiles/clip", element: /* @__PURE__ */ jsxRuntimeExports.jsx(ClipTiles, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "settings", element: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, {}) })
  ] }) });
}
createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(BrowserRouter, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) }) })
);
//# sourceMappingURL=index-BwEwwNzB.js.map
