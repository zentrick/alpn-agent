const _list = Symbol('list')

const SEPARATOR = '\x2C\x20'

class HeaderList {
  constructor () {
    this[_list] = []
  }

  _find (name, startIndex = 0) {
    name = name.toLowerCase()
    for (let i = startIndex; i < this[_list].length; ++i) {
      const [headerName] = this[_list][i]
      if (headerName.toLowerCase() === name) {
        return i
      }
    }
    return -1
  }

  _delete (name, startIndex = 0) {
    let index = startIndex
    while (index < this[_list].length) {
      index = this._find(name, index)
      if (index < 0) {
        return
      }
      this[_list].splice(index)
    }
  }

  get (name) {
    let result = null
    let index = 0
    while (index < this[_list].length) {
      index = this._find(name, index)
      if (index < 0) {
        break
      }
      const [, headerValue] = this[_list][index]
      result = result === null
        ? headerValue
        : result + SEPARATOR + headerValue
      index++
    }
    return result
  }

  contains (name) {
    return this._find(name) >= 0
  }

  append (name, value) {
    const existingHeaderIndex = this._find(name)
    if (existingHeaderIndex >= 0) {
      name = this[_list][existingHeaderIndex][0]
    }
    this[_list].push([name, value])
  }

  set (name, value) {
    const existingHeaderIndex = this._find(name)
    if (existingHeaderIndex >= 0) {
      this[_list][existingHeaderIndex][1] = value
      this._delete(name, existingHeaderIndex + 1)
    } else {
      this[_list].push([name, value])
    }
  }

  delete (name) {
    this._delete(name)
  }

  sortCombine () {
    const headers = []
    const names = []
    for (let [name] of this[_list]) {
      name = name.toLowerCase()
      if (names.indexOf(name) < 0) {
        names.push(name)
      }
    }
    names.sort()
    for (const name of names) {
      const value = this.get(name)
      headers.push([name, value])
    }
    return headers
  }
}

module.exports = HeaderList
