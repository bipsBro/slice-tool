const path = require('path')
const Git = require('nodegit')
const fs = require('fs-extra')
const _ = require('lodash')
const { CONFIG_FILENAME, DEFAULT_BRANCH } = require('../constants')

async function modifyIgnoredFiles(currentDir, filesToAdd, filesToRemove) {
  try {
    const config = await fs.readJson(path.resolve(currentDir, CONFIG_FILENAME))
    const folderRepo = await Git.Repository.open(currentDir)
    await folderRepo.checkoutBranch(DEFAULT_BRANCH, new Git.CheckoutOptions())
    const commonFileExists = filesToAdd.some(function (v) {
      return filesToRemove.indexOf(v) >= 0
    })
    if (commonFileExists) {
      throw 'Error: Both add and remove operation is being performed on the same file'
    }
    let updatedIgnoredFiles = config.ignore
    if (filesToAdd.length) {
      updatedIgnoredFiles = _.uniq([...updatedIgnoredFiles, ...filesToAdd])
    }
    if (filesToRemove.length) {
      updatedIgnoredFiles = updatedIgnoredFiles.filter(
        (x) => filesToRemove.indexOf(x) === -1
      )
    }
    await fs.writeJson(
      path.resolve(currentDir, CONFIG_FILENAME),
      {
        ...config,
        ignore: updatedIgnoredFiles,
      },
      { spaces: 2 }
    )
    let index = await folderRepo.refreshIndex()
    await index.addByPath(CONFIG_FILENAME)
    await index.write()
    const oid = await index.writeTree()
    const parent = await folderRepo.getCommit(
      await Git.Reference.nameToId(folderRepo, 'HEAD')
    )
    const signature = folderRepo.defaultSignature()
    await folderRepo.createCommit(
      'HEAD',
      signature,
      signature,
      `updated ${CONFIG_FILENAME}`,
      oid,
      [parent]
    )

    console.log(`Ignored files are sucessfully updated`)
  } catch (e) {
    return Promise.reject(e)
  }
}

module.exports = modifyIgnoredFiles
