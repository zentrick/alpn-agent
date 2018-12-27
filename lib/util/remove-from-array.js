module.exports = (arr, item) => {
  const index = arr.indexOf(item)
  if (index >= 0) {
    arr.splice(index, 1)
  }
}
