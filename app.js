/* eslint-disable no-param-reassign */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-restricted-syntax */
const path = require('path')
const jimp = require('jimp')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')

const ARRAY_IMAGE = ['/assets/example1.webp'] // Example of image locally, can also change to image online

function doFunc(alpha, j, w) {
  const alphaMatte = alpha / 255.0
  const res = (j - alphaMatte * w) / (1 - alphaMatte).toFixed(2)

  if (res < 0) {
    return 0
  }
  return res
}

async function doWhoop(rawImage, maskIndex) {
  const { width, height } = rawImage.bitmap

  await new Promise((resolve) => {
    rawImage.scan(0, 0, width, height, (x, y, idx) => {
      if (typeof maskIndex[x] === 'object' && typeof maskIndex[x][y] === 'object') {
        const { red, green, blue, alpha } = maskIndex[x][y]

        if (alpha > 0) {
          const xred = rawImage.bitmap.data[idx + 0]
          const xgreen = rawImage.bitmap.data[idx + 1]
          const xblue = rawImage.bitmap.data[idx + 2]

          const avgR = doFunc(alpha, xred, red)
          const avgG = doFunc(alpha, xgreen, green)
          const avgB = doFunc(alpha, xblue, blue)

          // eslint-disable-next-line no-param-reassign
          rawImage.bitmap.data[idx + 0] = Math.round(avgR)
          // eslint-disable-next-line no-param-reassign
          rawImage.bitmap.data[idx + 1] = Math.round(avgG)
          // eslint-disable-next-line no-param-reassign
          rawImage.bitmap.data[idx + 2] = Math.round(avgB)
        }
      }

      if (x === rawImage.bitmap.width - 1 && y === rawImage.bitmap.height - 1) {
        resolve()
      }
    })
  })
}

async function removeAndAdd(rawImage, maskImage) {
  let width
  let height
  if (rawImage.bitmap.width !== maskImage.bitmap.width) {
    width = rawImage.bitmap.width
  }
  if (rawImage.bitmap.height !== maskImage.bitmap.height) {
    height = rawImage.bitmap.height
  }

  if (width && height) {
    maskImage.resize(width, height)
  }

  const maskIndex = {}
  await new Promise((resolve) => {
    maskImage.scan(0, 0, maskImage.bitmap.width, maskImage.bitmap.height, (x, y, idx) => {
      const red = maskImage.bitmap.data[idx + 0]
      const green = maskImage.bitmap.data[idx + 1]
      const blue = maskImage.bitmap.data[idx + 2]
      const alpha = maskImage.bitmap.data[idx + 3]

      if (alpha > 0) {
        if (maskIndex[x] === undefined) {
          maskIndex[x] = {}
        }
        maskIndex[x][y] = { red, green, blue, alpha }
      }

      if (x === maskImage.bitmap.width - 1 && y === maskImage.bitmap.height - 1) {
        resolve()
      }
    })
  })
  await doWhoop(rawImage, maskIndex)
  return true
}

async function saveRemoveWatermark(pathImage) {
  const rawImage = await jimp.read(`${process.cwd()}${pathImage}`)
  const dataName = `${uuidv4()}_${new Date().getTime()}.webp`
  const tempPath = `temp`
  if (!fs.existsSync(path.resolve(tempPath))) {
    fs.mkdirSync(path.resolve(tempPath), { recursive: true })
  }
  const filePath = path.resolve(`${tempPath}/${dataName}`)

  const maskImage = await jimp.read(`${process.cwd()}/assets/watermarkExample.png`)
  await removeAndAdd(rawImage, maskImage)

  await rawImage.writeAsync(filePath)
}

async function run() {
  if (ARRAY_IMAGE.length > 0) {
    for await (const pathImage of ARRAY_IMAGE) {
      await saveRemoveWatermark(pathImage)
    }
  }
}

run()
