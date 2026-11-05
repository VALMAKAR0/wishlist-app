if (typeof URL === 'undefined') {
  const parse = (s) => {
    const m = /^(https?:)\/\/(?:[^/?#@]*@)?([^/?#:]+)(?::(\d+))?([^?#]*)(\?[^#]*)?(#.*)?$/i.exec(s)
    return m ? { protocol: m[1].toLowerCase(), hostname: m[2].toLowerCase(), port: m[3] || '', pathname: m[4] || '/', search: m[5] || '', hash: m[6] || '' } : null
  }
  const norm = (p) => {
    const out = []
    for (const seg of p.split('/')) {
      if (seg === '..') out.pop()
      else if (seg !== '.') out.push(seg)
    }
    const j = out.join('/')
    return j.startsWith('/') ? j : '/' + j
  }
  globalThis.URL = class URL {
    constructor(input, base) {
      let s = String(input).trim()
      let u = parse(s)
      if (!u && base !== undefined) {
        const b = parse(String(base))
        if (!b) throw new TypeError('Invalid URL')
        const root = b.protocol + '//' + b.hostname + (b.port ? ':' + b.port : '')
        if (s.startsWith('//')) s = b.protocol + s
        else if (s.startsWith('/')) s = root + s
        else if (s.startsWith('?')) s = root + b.pathname + s
        else if (s.startsWith('#')) s = root + b.pathname + b.search + s
        else s = root + b.pathname.replace(/[^/]*$/, '') + s
        u = parse(s)
        if (u) u.pathname = norm(u.pathname)
      }
      if (!u) throw new TypeError('Invalid URL')
      this.protocol = u.protocol
      this.hostname = u.hostname
      this.port = u.port
      this.host = u.hostname + (u.port ? ':' + u.port : '')
      this.pathname = u.pathname
      this.search = u.search
      this.hash = u.hash
      this.origin = u.protocol + '//' + this.host
    }
    get href() {
      return this.origin + this.pathname + this.search + this.hash
    }
    toString() {
      return this.href
    }
  }
}
