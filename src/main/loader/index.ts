import * as fs from 'node:fs'

import { LocalPathLoader, RAGApplication, TextLoader } from '@llm-tools/embedjs'
import type { AddLoaderReturn } from '@llm-tools/embedjs-interfaces'
import { WebLoader } from '@llm-tools/embedjs-loader-web'
import { LoaderReturn } from '@shared/config/types'
import { FileType, KnowledgeBaseParams } from '@types'
import Logger from 'electron-log'

import { EpubLoader } from './epubLoader'
import { OdLoader, OdType } from './odLoader'

// embedjs内置loader类型
const commonExts = ['.pdf', '.csv', '.json', '.docx', '.pptx', '.xlsx', '.md']

export async function addOdLoader(
  ragApplication: RAGApplication,
  file: FileType,
  base: KnowledgeBaseParams,
  forceReload: boolean
): Promise<AddLoaderReturn> {
  const loaderMap: Record<string, OdType> = {
    '.odt': OdType.OdtLoader,
    '.ods': OdType.OdsLoader,
    '.odp': OdType.OdpLoader
  }
  const odType = loaderMap[file.ext]
  if (!odType) {
    throw new Error('Unknown odType')
  }
  return ragApplication.addLoader(
    new OdLoader({
      odType,
      filePath: file.path,
      chunkSize: base.chunkSize,
      chunkOverlap: base.chunkOverlap
    }) as any,
    forceReload
  )
}

export async function addFileLoader(
  ragApplication: RAGApplication,
  file: FileType,
  base: KnowledgeBaseParams,
  forceReload: boolean
): Promise<LoaderReturn> {
  // 内置类型
  if (commonExts.includes(file.ext)) {
    const loaderReturn = await ragApplication.addLoader(
      // @ts-ignore LocalPathLoader
      new LocalPathLoader({ path: file.path, chunkSize: base.chunkSize, chunkOverlap: base.chunkOverlap }) as any,
      forceReload
    )
    return {
      entriesAdded: loaderReturn.entriesAdded,
      uniqueId: loaderReturn.uniqueId,
      uniqueIds: [loaderReturn.uniqueId],
      loaderType: loaderReturn.loaderType
    } as LoaderReturn
  }

  // 自定义类型
  if (['.odt', '.ods', '.odp'].includes(file.ext)) {
    const loaderReturn = await addOdLoader(ragApplication, file, base, forceReload)
    return {
      entriesAdded: loaderReturn.entriesAdded,
      uniqueId: loaderReturn.uniqueId,
      uniqueIds: [loaderReturn.uniqueId],
      loaderType: loaderReturn.loaderType
    } as LoaderReturn
  }

  // epub 文件处理
  if (file.ext === '.epub') {
    const loaderReturn = await ragApplication.addLoader(
      new EpubLoader({
        filePath: file.path,
        chunkSize: base.chunkSize ?? 1000,
        chunkOverlap: base.chunkOverlap ?? 200
      }) as any,
      forceReload
    )
    return {
      entriesAdded: loaderReturn.entriesAdded,
      uniqueId: loaderReturn.uniqueId,
      uniqueIds: [loaderReturn.uniqueId],
      loaderType: loaderReturn.loaderType
    } as LoaderReturn
  }

  const fileContent = fs.readFileSync(file.path, 'utf-8')
  // HTML类型
  if (['.html', '.htm'].includes(file.ext)) {
    const loaderReturn = await ragApplication.addLoader(
      new WebLoader({
        urlOrContent: fileContent,
        chunkSize: base.chunkSize,
        chunkOverlap: base.chunkOverlap
      }) as any,
      forceReload
    )
    return {
      entriesAdded: loaderReturn.entriesAdded,
      uniqueId: loaderReturn.uniqueId,
      uniqueIds: [loaderReturn.uniqueId],
      loaderType: loaderReturn.loaderType
    }
  }

  // 文本类型
  const loaderReturn = await ragApplication.addLoader(
    new TextLoader({ text: fileContent, chunkSize: base.chunkSize, chunkOverlap: base.chunkOverlap }) as any,
    forceReload
  )

  Logger.info('[KnowledgeBase] processing file', file.path)

  return {
    entriesAdded: loaderReturn.entriesAdded,
    uniqueId: loaderReturn.uniqueId,
    uniqueIds: [loaderReturn.uniqueId],
    loaderType: loaderReturn.loaderType
  } as LoaderReturn
}
