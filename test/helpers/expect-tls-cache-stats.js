module.exports = (t, expected) => {
  const {hits, misses, evictions} = t.context.agent.tlsSessionCache
  t.deepEqual({hits, misses, evictions}, expected)
}
