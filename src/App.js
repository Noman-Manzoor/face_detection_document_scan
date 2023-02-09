import { useCallback, useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import './App.css';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
const dobRegex =
  /^(0[1-9]|[12][0-9]|3[01])[-\/\.](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\/\.](19[0-9][0-9]|20[0-2][0-9])$/i;

function App() {
  const idCardRef = useRef();
  const selfieRef = useRef();
  const [text, setText] = useState('');
  const [isMatch, setIsMatch] = useState('');

  const extractText = async () => {
    const { data } = await Tesseract.recognize(idCardRef.current.src);
    const dobRegex = /(\d{6})(\w{1})(\d{6})/;
    const dobMatch = data.text.match(dobRegex);
    const dob = dobMatch[1];
    setText(dob);
  };

  const renderFace = async (image, x, y, width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // canvas.toBlob((blob) => {
    //   image.src = URL.createObjectURL(blob);
    // }, 'image/jpeg');
  };

  const onMatch = async () => {
    setText('LOADING');
    setIsMatch('MATCHING');
    const MODEL_URL = process.env.PUBLIC_URL + '/models';
    // loading the models
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);

    // detect a single face from the ID card image
    const idCardFacedetection = await faceapi
      .detectSingleFace(
        idCardRef.current,
        new faceapi.TinyFaceDetectorOptions()
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    // detect a single face from the selfie image
    const selfieFacedetection = await faceapi
      .detectSingleFace(
        selfieRef.current,
        new faceapi.TinyFaceDetectorOptions()
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (idCardFacedetection) {
      const { x, y, width, height } = idCardFacedetection.detection.box;
      renderFace(idCardRef.current, x, y, width, height);
    }
    if (selfieFacedetection) {
      const { x, y, width, height } = selfieFacedetection.detection.box;
      renderFace(selfieRef.current, x, y, width, height);
    }

    if (idCardFacedetection && selfieFacedetection) {
      // Using Euclidean distance to comapare face descriptions
      const distance = faceapi.euclideanDistance(
        idCardFacedetection.descriptor,
        selfieFacedetection.descriptor
      );
      setIsMatch(
        distance < 0.3
          ? `Face found ${100 - (distance.toFixed(2) / 1) * 100}%`
          : 'Unable to Recognize'
      );
    } else {
      setIsMatch('Unable to Recognize');
    }
    extractText();
  };

  const [img, setImg] = useState(null);
  const webCamRef = useRef(null);

  const capture = useCallback(() => {
    const imageSrc = webCamRef.current.getScreenshot();
    setImg(imageSrc);
  }, [webCamRef]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1em',
      }}
    >
      <div style={{ display: 'flex', gap: '1em', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1em',
          }}
        >
          <img
            ref={idCardRef}
            alt='ID card'
            style={{
              width: '450px',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <input
            type='file'
            name='file'
            id='file'
            onChange={(e) => {
              idCardRef.current.src = URL.createObjectURL(e.target.files[0]);
            }}
          />
        </div>
        <div>
          {img ? (
            <img
              ref={selfieRef}
              src={img}
              alt='screenshot'
              style={{
                width: '450px',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <Webcam
              ref={webCamRef}
              imageSmoothing={true}
              screenshotFormat='image/webp'
              style={{
                width: '450px',
                height: '100%',
              }}
              mirrored={false}
            />
          )}
          <div>
            <button
              onClick={() => {
                if (img) {
                  setImg(null);
                } else {
                  capture();
                }
              }}
            >
              {img ? 'Retake' : 'Click Photo'}
            </button>
            <button onClick={onMatch}>Verify</button>
          </div>
        </div>
      </div>
      <h2>{isMatch}</h2>
      <h2>MRZ DOB: {text}</h2>
    </div>
  );
}

export default App;
