/* eslint-disable no-param-reassign */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-restricted-syntax */
const path = require('path')
const jimp = require('jimp')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')

const ARRAY_IMAGE = ['/assets/example1.webp'] // Example of image locally, can also change to image online

const TEMP_PATH_IMAGE = `temp`

function doFunc(alpha, j, w) {
  const alphaMatte = alpha / 255.0
  const res = (j - alphaMatte * w) / (1 - alphaMatte).toFixed(2)

  if (res < 0) {
    return 0
  }
  return res
}

async function doRemove(rawImage, watermarkIndex) {
  const { width, height } = rawImage.bitmap

  await new Promise((resolve) => {
    rawImage.scan(0, 0, width, height, (x, y, idx) => {
      if (typeof watermarkIndex[x] === 'object' && typeof watermarkIndex[x][y] === 'object') {
        const { red, green, blue, alpha } = watermarkIndex[x][y]

        if (alpha > 0) {
          const xred = rawImage.bitmap.data[idx + 0]
          const xgreen = rawImage.bitmap.data[idx + 1]
          const xblue = rawImage.bitmap.data[idx + 2]

          const avgR = doFunc(alpha, xred, red)
          const avgG = doFunc(alpha, xgreen, green)
          const avgB = doFunc(alpha, xblue, blue)

          rawImage.bitmap.data[idx + 0] = Math.round(avgR)
          rawImage.bitmap.data[idx + 1] = Math.round(avgG)
          rawImage.bitmap.data[idx + 2] = Math.round(avgB)
        }
      }

      if (x === rawImage.bitmap.width - 1 && y === rawImage.bitmap.height - 1) {
        resolve()
      }
    })
  })
}

async function removeWatermark(rawImage, watermarkImage) {
  let width
  let height
  if (rawImage.bitmap.width !== watermarkImage.bitmap.width) {
    width = rawImage.bitmap.width
  }
  if (rawImage.bitmap.height !== watermarkImage.bitmap.height) {
    height = rawImage.bitmap.height
  }

  if (width && height) {
    watermarkImage.resize(width, height)
  }

  const watermarkIndex = {}
  await new Promise((resolve) => {
    watermarkImage.scan(
      0,
      0,
      watermarkImage.bitmap.width,
      watermarkImage.bitmap.height,
      (x, y, idx) => {
        const red = watermarkImage.bitmap.data[idx + 0]
        const green = watermarkImage.bitmap.data[idx + 1]
        const blue = watermarkImage.bitmap.data[idx + 2]
        const alpha = watermarkImage.bitmap.data[idx + 3]

        if (alpha > 0) {
          if (watermarkIndex[x] === undefined) {
            watermarkIndex[x] = {}
          }
          watermarkIndex[x][y] = { red, green, blue, alpha }
        }

        if (x === watermarkImage.bitmap.width - 1 && y === watermarkImage.bitmap.height - 1) {
          resolve()
        }
      }
    )
  })
  await doRemove(rawImage, watermarkIndex)
  return true
}

async function saveRemoveWatermark(pathImage) {
  const rawImage = await jimp.read(`${process.cwd()}${pathImage}`)
  const dataName = `${uuidv4()}_${new Date().getTime()}.webp`

  if (!fs.existsSync(path.resolve(TEMP_PATH_IMAGE))) {
    fs.mkdirSync(path.resolve(TEMP_PATH_IMAGE), { recursive: true })
  }
  const filePath = path.resolve(`${TEMP_PATH_IMAGE}/${dataName}`)

  const watermarkImage = await jimp.read(`${process.cwd()}/assets/watermarkExample.png`)
  await removeWatermark(rawImage, watermarkImage)

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
