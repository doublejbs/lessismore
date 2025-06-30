/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// GET 요청에서 imageUrl, name 파라미터 받기
import * as functions from 'firebase-functions';
import { Storage } from '@google-cloud/storage';
import fetch from 'node-fetch';

// Google Cloud Storage 인스턴스 생성
const storage = new Storage();
const bucketName = 'lessismore-7e070.appspot.com'; // 자신의 GCS 버킷 이름으로 변경

functions.setGlobalOptions({ region: 'asia-northeast3' });

export const uploadImageFromUrl = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { imageUrl, name } = req.body;
  if (!imageUrl || !name) {
    res.status(400).send('Missing imageUrl or name parameter');
    return;
  }

  try {
    // 이미지 다운로드
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    if (!response.ok) {
      const text = await response.text(); // 응답 본문 읽기
      throw new Error(`이미지 다운로드 실패: ${response.status} ${response.statusText} - ${text}`);
    }
    const buffer = await response.buffer();

    // Content-Type에서 확장자 추출
    const contentType = response.headers.get('content-type') || undefined;
    let extension = '';
    if (contentType) {
      if (contentType === 'image/jpeg') extension = '.jpg';
      else if (contentType === 'image/png') extension = '.png';
      else if (contentType === 'image/gif') extension = '.gif';
      // 필요시 더 추가
    }

    // 이미 name에 확장자가 없으면 붙여줌
    let fileName = name;
    if (extension && !name.toLowerCase().endsWith(extension)) {
      fileName += extension;
    }

    // Storage에 업로드
    const file = storage.bucket(bucketName).file(`gears/${fileName}`);
    await file.save(buffer, {
      contentType,
      public: true,
    });

    // 공개 URL 생성
    const downloadURL = `https://storage.googleapis.com/${bucketName}/gears/${fileName}`;

    res.status(200).json({ downloadURL });
  } catch (error) {
    console.error('이미지 다운로드 실패:', error);
    res.status(500).send(error.message);
  }
});
