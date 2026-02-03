module.exports = new Proxy(
  {},
  {
    get: function (target, key) {
      if (key === '__esModule') {
        return false;
      }
      return key;
    },
  },
);
