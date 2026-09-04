/* ==========================================================================
   EuroMasters — lớp kích hoạt Pro
   Thứ tự xác thực:
     1) Master key của tác giả (1 key duy nhất, so khớp SHA-256, chạy offline)
     2) Gumroad License API  (nguồn sự thật khi bán hàng cho khách)
   Lưu ý: đây là kiểm tra phía trình duyệt, phù hợp cho sản phẩm thông tin.
   Muốn chống sao chép triệt để thì cần một proxy phía server (xem README).
   ========================================================================== */
(function () {
  "use strict";
  var CFG = window.EMT_CONFIG;
  var I18N = window.EMT_I18N;
  function t(k, v) { return I18N ? I18N.t(k, v) : k; }
  var LS_KEY = "emt.license.v1";

  /* ---------------------------------------------------------------- SHA-256
     Dùng để so khớp MASTER_KEY_HASH mà không phải để key thô trong mã nguồn.
     Bản đồng bộ (không cần crypto.subtle) nên chạy được cả trên file://.
     Đối chiếu với hashlib.sha256 của Python — xem tools/keyhash.py.
  ------------------------------------------------------------------------ */
  var SHA_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function utf8Bytes(str) {
    var b = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) b.push(c);
      else if (c < 0x800) b.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0xd800 || c >= 0xe000) b.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else {
        i++;
        var cp = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        b.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      }
    }
    return b;
  }

  function sha256Hex(str) {
    function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
             0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var bytes = utf8Bytes(str);
    var bitLenLo = (bytes.length * 8) >>> 0;
    var bitLenHi = Math.floor(bytes.length / 536870912) >>> 0;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    bytes.push((bitLenHi >>> 24) & 255, (bitLenHi >>> 16) & 255, (bitLenHi >>> 8) & 255, bitLenHi & 255,
               (bitLenLo >>> 24) & 255, (bitLenLo >>> 16) & 255, (bitLenLo >>> 8) & 255, bitLenLo & 255);

    var w = new Array(64), i, off;
    for (off = 0; off < bytes.length; off += 64) {
      for (i = 0; i < 16; i++) {
        w[i] = ((bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) |
                (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3]) | 0;
      }
      for (i = 16; i < 64; i++) {
        var x = w[i - 15], y = w[i - 2];
        var s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
        var s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
        w[i] = (((w[i - 16] + s0) | 0) + ((w[i - 7] + s1) | 0)) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (((((h + S1) | 0) + ((ch + SHA_K[i]) | 0)) | 0) + w[i]) | 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = "";
    for (i = 0; i < 8; i++) {
      var v = (H[i] >>> 0).toString(16);
      out += "00000000".slice(v.length) + v;
    }
    return out;
  }

  function normalize(key) {
    return String(key || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  /* Master key — MỘT key duy nhất do bạn tự đặt, so khớp bằng SHA-256 nên key
     thô không nằm trong mã nguồn. Sinh hash: python tools/keyhash.py <KEY> */
  function verifyMaster(key) {
    if (!CFG.MASTER_KEY_HASH) return false;
    var k = normalize(key);
    if (!k) return false;
    return sha256Hex(k + "|" + CFG.KEY_SALT) === String(CFG.MASTER_KEY_HASH).toLowerCase();
  }

  /* Gumroad License API */
  function verifyGumroad(key) {
    var body = new URLSearchParams();
    if (CFG.GUMROAD_PRODUCT_ID) body.set("product_id", CFG.GUMROAD_PRODUCT_ID);
    else body.set("product_permalink", CFG.GUMROAD_PERMALINK);
    body.set("license_key", String(key || "").trim());
    body.set("increment_uses_count", "false");

    return fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    })
      .then(function (r) { return r.json().catch(function () { return null; }); })
      .then(function (j) {
        if (!j) return { state: "unreachable" };
        if (j.success !== true) {
          var m = (j.message || "").toLowerCase();
          if (m.indexOf("product") !== -1 && m.indexOf("not") !== -1) return { state: "unreachable" };
          return { state: "invalid", message: j.message || t("key.invalid") };
        }
        var p = j.purchase || {};
        if (p.refunded || p.chargebacked || p.disputed) {
          return { state: "invalid", message: t("key.refunded") };
        }
        if (p.subscription_cancelled_at || p.subscription_failed_at) {
          return { state: "invalid", message: t("key.expired") };
        }
        if (CFG.MAX_USES > 0 && typeof j.uses === "number" && j.uses > CFG.MAX_USES) {
          return { state: "invalid", message: t("key.tooManyUses", { n: CFG.MAX_USES }) };
        }
        return {
          state: "valid",
          source: "gumroad",
          email: p.email || "",
          product: p.product_name || "",
          uses: j.uses || 1
        };
      })
      .catch(function () { return { state: "unreachable" }; });
  }

  var Premium = {
    active: false,
    info: null,

    load: function () {
      try {
        var raw = localStorage.getItem(LS_KEY);
        if (!raw) return false;
        var d = JSON.parse(raw);
        if (!d || !d.key) return false;
        // Master key kiểm tra lại được ngay; key Gumroad tin vào bản đã lưu
        // (đã xác thực lúc kích hoạt) để app vẫn chạy khi mất mạng.
        if (d.source === "master" && !verifyMaster(d.key)) { this.clear(); return false; }
        this.active = true;
        this.info = d;
        return true;
      } catch (e) { return false; }
    },

    save: function (key, res) {
      var d = {
        key: String(key).trim(),
        source: res.source || "master",
        email: res.email || "",
        product: res.product || "",
        at: new Date().toISOString()
      };
      try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch (e) {}
      this.active = true;
      this.info = d;
      return d;
    },

    clear: function () {
      try { localStorage.removeItem(LS_KEY); } catch (e) {}
      this.active = false;
      this.info = null;
    },

    /* -> Promise<{ok:boolean, message:string, source?:string}> */
    activate: function (key) {
      var self = this;
      var raw = String(key || "").trim();
      if (raw.length < 8) {
        return Promise.resolve({ ok: false, message: t("key.tooShort") });
      }
      // 1) master key — nhanh, không cần mạng
      if (verifyMaster(raw)) {
        this.save(raw, { source: "master" });
        return Promise.resolve({ ok: true, source: "master", message: t("key.ok") });
      }
      // 2) key khách mua trên Gumroad
      return verifyGumroad(raw).then(function (res) {
        if (res.state === "valid") {
          self.save(raw, res);
          return { ok: true, source: "gumroad", message: res.email ? t("key.okFor", { email: res.email }) : t("key.ok") };
        }
        if (res.state === "invalid") {
          return { ok: false, message: res.message || t("key.invalid") };
        }
        return {
          ok: false,
          message: t("key.offline")
        };
      });
    },

    /* Dùng để chặn tính năng: trả về true nếu được phép */
    gate: function (featureLabel) {
      if (this.active) return true;
      if (window.EMT && window.EMT.openPro) window.EMT.openPro(featureLabel);
      return false;
    }
  };

  Premium.load();
  window.EMT_PREMIUM = Premium;
  window.EMT_PREMIUM._verifyMaster = verifyMaster; // để test
  window.EMT_PREMIUM._sha256 = sha256Hex;   // để test đối chiếu với Python
})();
