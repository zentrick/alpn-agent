const _name = Symbol('name')

exports.setSessionName = (session, name) => { session[_name] = name }
exports.getSessionName = session => session[_name]
