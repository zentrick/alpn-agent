module.exports = (t, expected) => {
  const { h1Hits, h1Misses } = t.context.agent
  t.deepEqual({ h1Hits, h1Misses }, expected)
}
