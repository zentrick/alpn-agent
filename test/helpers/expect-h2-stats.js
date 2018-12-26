module.exports = (t, expected) => {
  const { h2Hits, h2Misses } = t.context.agent
  t.deepEqual({ h2Hits, h2Misses }, expected)
}
