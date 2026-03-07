import React, { useRef, useState, useCallback } from 'react';
import {
  Alert,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Modal,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { decodeQR } from '../api/qr';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'CanteenWebView'>;

export default function CanteenWebViewScreen({ navigation, route }: Props) {
  const { canteen, url } = route.params;
  const { user } = useAuth();
  const webViewRef = useRef<WebView>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [decodedData, setDecodedData] = useState<string | null>(null);
  const [extractedPrice, setExtractedPrice] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const captureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDark = user?.dark_mode ?? false;
  const colors = isDark
    ? { bg: '#1a1a2e', card: '#16213e', text: '#eee', sub: '#aaa', accent: '#0f3460' }
    : { bg: '#f5f5f5', card: '#fff', text: '#333', sub: '#666', accent: '#003366' };

  interface CaptureResult {
    type: string;
    image: string | null;
    price: number;
    debug?: string;
  }

  function buildCaptureScript(): string {
    return `
      (function () {
        var debugLog = [];
        function log(msg) {
          try {
            debugLog.push(String(msg));
          } catch (_) {
            debugLog.push('log-error');
          }
        }

        try {
          log('=== capture start ===');

          function shortUrl(url) {
            if (!url) {
              return '';
            }
            return url.length > 80 ? url.substring(0, 80) + '…' : url;
          }

          function extractPrice() {
            try {
              var bodyText = (document.body && document.body.innerText) || '';
              var priceRegex = /\\$\\s*(\\d+(?:\\.\\d{1,2})?)/;
              var match = bodyText.match(priceRegex);
              var price = match ? parseFloat(match[1]) : 0;
              log('price extracted: ' + price);
              return price;
            } catch (e) {
              log('extractPrice failed: ' + (e && e.message ? e.message : String(e)));
              return 0;
            }
          }

          function postResult(image) {
            log('postResult image=' + (image ? 'yes len=' + String(image.length) : 'no'));
            var msg = JSON.stringify({
              type: 'qr_capture_result',
              image: image,
              price: extractPrice(),
              debug: debugLog.join(' | '),
            });
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(msg);
            }
          }

          function imgDimensions(img) {
            return 'natural=' + (img.naturalWidth || 0) + 'x' + (img.naturalHeight || 0) + ', display=' + (img.width || 0) + 'x' + (img.height || 0);
          }

          function collectImages() {
            var images = document.querySelectorAll('img');
            log('imgs found: ' + images.length);
            for (var i = 0; i < images.length && i < 8; i++) {
              var img = images[i];
              log('img[' + i + '] src=' + shortUrl(img.src || '') + ' ' + imgDimensions(img));
            }
            return images;
          }

          function findQrImage(images) {
            var best = null;
            var bestArea = 0;
            for (var i = 0; i < images.length; i++) {
              var img = images[i];
              var w = img.naturalWidth || img.width;
              var h = img.naturalHeight || img.height;
              var area = w * h;
              if (area > bestArea && w > 50 && h > 50) {
                best = img;
                bestArea = area;
              }
            }
            if (best) {
              log('best img picked: src=' + shortUrl(best.src || '') + ' area=' + bestArea + ' ' + imgDimensions(best));
            } else {
              log('no suitable img candidate');
            }
            return best;
          }

          function drawImgToCanvas(img, tag) {
            log('trying strategy ' + tag + ' drawImage src=' + shortUrl(img.src || '') + ' ' + imgDimensions(img));
            try {
              var c = document.createElement('canvas');
              c.width = img.naturalWidth || img.width;
              c.height = img.naturalHeight || img.height;
              var ctx = c.getContext('2d');
              if (!ctx) {
                log('strategy ' + tag + ' failed: no canvas context');
                return null;
              }
              ctx.drawImage(img, 0, 0);
              var d = c.toDataURL('image/png');
              if (d && d.indexOf('data:image') === 0 && d.length > 100) {
                log('strategy ' + tag + ' success');
                return d;
              }
              log('strategy ' + tag + ' failed: invalid data url');
              return null;
            } catch (e) {
              log('strategy ' + tag + ' failed: ' + (e && e.message ? e.message : String(e)));
              return null;
            }
          }

          function fetchImageAsBase64(url, callback) {
            log('trying strategy img(fetch) url=' + shortUrl(url));
            fetch(url, { mode: 'cors', credentials: 'include' })
              .then(function (res) {
                if (!res.ok) {
                  throw new Error('http ' + res.status);
                }
                return res.blob();
              })
              .then(function (blob) {
                var reader = new FileReader();
                reader.onloadend = function () {
                  if (typeof reader.result === 'string' && reader.result.indexOf('data:image') === 0) {
                    log('strategy img(fetch) success');
                    callback(reader.result);
                    return;
                  }
                  log('strategy img(fetch) failed: invalid reader result');
                  callback(null);
                };
                reader.onerror = function () {
                  log('strategy img(fetch) failed: reader error');
                  callback(null);
                };
                reader.readAsDataURL(blob);
              })
              .catch(function (e) {
                log('strategy img(fetch) failed: ' + (e && e.message ? e.message : String(e)));
                callback(null);
              });
          }

          function fetchImageNoCors(url, callback) {
            log('trying strategy img(xhr) url=' + shortUrl(url));
            try {
              var xhr = new XMLHttpRequest();
              xhr.open('GET', url, true);
              xhr.responseType = 'blob';
              xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
                  var reader = new FileReader();
                  reader.onloadend = function () {
                    if (typeof reader.result === 'string' && reader.result.indexOf('data:image') === 0) {
                      log('strategy img(xhr) success');
                      callback(reader.result);
                      return;
                    }
                    log('strategy img(xhr) failed: invalid reader result');
                    callback(null);
                  };
                  reader.onerror = function () {
                    log('strategy img(xhr) failed: reader error');
                    callback(null);
                  };
                  reader.readAsDataURL(xhr.response);
                  return;
                }
                log('strategy img(xhr) failed: status ' + xhr.status);
                callback(null);
              };
              xhr.onerror = function () {
                log('strategy img(xhr) failed: network error');
                callback(null);
              };
              xhr.send();
            } catch (e) {
              log('strategy img(xhr) failed: ' + (e && e.message ? e.message : String(e)));
              callback(null);
            }
          }

          function reloadImgWithCors(img, callback) {
            log('trying strategy img(cors-reload) src=' + shortUrl(img.src || ''));
            if (!img.src) {
              log('strategy img(cors-reload) failed: no src');
              callback(null);
              return;
            }
            try {
              var probe = new window.Image();
              probe.crossOrigin = 'anonymous';
              probe.onload = function () {
                var b64 = drawImgToCanvas(probe, 'img(cors-reload)');
                callback(b64);
              };
              probe.onerror = function () {
                log('strategy img(cors-reload) failed: onerror');
                callback(null);
              };
              probe.src = img.src;
            } catch (e) {
              log('strategy img(cors-reload) failed: ' + (e && e.message ? e.message : String(e)));
              callback(null);
            }
          }

          function findQrCanvas() {
            var canvases = document.querySelectorAll('canvas');
            log('canvases found: ' + canvases.length);
            var best = null;
            var bestArea = 0;
            for (var i = 0; i < canvases.length; i++) {
              var c = canvases[i];
              log('canvas[' + i + '] size=' + c.width + 'x' + c.height);
              var area = c.width * c.height;
              if (area > bestArea && c.width > 50 && c.height > 50) {
                best = c;
                bestArea = area;
              }
            }
            if (best) {
              try {
                log('trying strategy canvas');
                var d = best.toDataURL('image/png');
                if (d && d.indexOf('data:image') === 0 && d.length > 100) {
                  log('strategy canvas success');
                  return d;
                }
                log('strategy canvas failed: invalid data url');
              } catch (e) {
                log('strategy canvas failed: ' + (e && e.message ? e.message : String(e)));
              }
            } else {
              log('strategy canvas failed: no canvas candidate');
            }
            return null;
          }

          function findQrSvg() {
            var svgs = document.querySelectorAll('svg');
            log('svgs found: ' + svgs.length);
            var best = null;
            var bestArea = 0;
            for (var i = 0; i < svgs.length; i++) {
              var svg = svgs[i];
              var rect = svg.getBoundingClientRect();
              log('svg[' + i + '] rect=' + rect.width + 'x' + rect.height);
              var area = rect.width * rect.height;
              if (area > bestArea && rect.width > 50 && rect.height > 50 && rect.width < 600) {
                best = svg;
                bestArea = area;
              }
            }
            return best;
          }

          function trySvgCapture(callback) {
            log('trying strategy svg');
            var svg = findQrSvg();
            if (!svg) {
              log('strategy svg failed: no svg candidate');
              callback(null);
              return;
            }
            try {
              var serializer = new XMLSerializer();
              var svgStr = serializer.serializeToString(svg);
              var svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
              var url = URL.createObjectURL(svgBlob);
              var rect = svg.getBoundingClientRect();
              var tempCanvas = document.createElement('canvas');
              tempCanvas.width = Math.max(1, Math.floor(rect.width * 2));
              tempCanvas.height = Math.max(1, Math.floor(rect.height * 2));
              var ctx = tempCanvas.getContext('2d');
              if (!ctx) {
                log('strategy svg failed: no canvas context');
                URL.revokeObjectURL(url);
                callback(null);
                return;
              }
              var img = new window.Image();
              img.onload = function () {
                try {
                  ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
                  var dataUrl = tempCanvas.toDataURL('image/png');
                  URL.revokeObjectURL(url);
                  if (dataUrl && dataUrl.indexOf('data:image') === 0 && dataUrl.length > 100) {
                    log('strategy svg success');
                    callback(dataUrl);
                    return;
                  }
                  log('strategy svg failed: invalid data url');
                  callback(null);
                } catch (e) {
                  URL.revokeObjectURL(url);
                  log('strategy svg failed: ' + (e && e.message ? e.message : String(e)));
                  callback(null);
                }
              };
              img.onerror = function () {
                URL.revokeObjectURL(url);
                log('strategy svg failed: image load error');
                callback(null);
              };
              img.src = url;
            } catch (e) {
              log('strategy svg failed: ' + (e && e.message ? e.message : String(e)));
              callback(null);
            }
          }

          function collectBackgroundImageUrls() {
            log('trying strategy css background');
            var elements = document.querySelectorAll('*');
            log('elements scanned for backgroundImage: ' + elements.length);
            var urls = [];
            var seen = {};
            for (var i = 0; i < elements.length; i++) {
              var style = window.getComputedStyle(elements[i]);
              var bg = style && style.backgroundImage ? style.backgroundImage : '';
              if (!bg || bg === 'none') {
                continue;
              }
              log('backgroundImage found: ' + shortUrl(bg));
              var re = /url\\((['\"]?)(.*?)\\1\\)/g;
              var match = re.exec(bg);
              while (match) {
                var candidate = match[2];
                if (candidate && !seen[candidate]) {
                  seen[candidate] = true;
                  urls.push(candidate);
                  log('backgroundImage url: ' + shortUrl(candidate));
                }
                match = re.exec(bg);
              }
            }
            log('backgroundImage urls unique: ' + urls.length);
            return urls;
          }

          function tryBackgroundCapture(callback) {
            var bgUrls = collectBackgroundImageUrls();
            if (!bgUrls.length) {
              log('strategy css background failed: no urls');
              callback(null);
              return;
            }
            var idx = 0;
            function next() {
              if (idx >= bgUrls.length) {
                log('strategy css background failed: all urls exhausted');
                callback(null);
                return;
              }
              var currentUrl = bgUrls[idx++];
              log('strategy css background trying url #' + idx + ': ' + shortUrl(currentUrl));
              fetchImageAsBase64(currentUrl, function (fetchB64) {
                if (fetchB64) {
                  log('strategy css background success via fetch');
                  callback(fetchB64);
                  return;
                }
                fetchImageNoCors(currentUrl, function (xhrB64) {
                  if (xhrB64) {
                    log('strategy css background success via xhr');
                    callback(xhrB64);
                    return;
                  }
                  next();
                });
              });
            }
            next();
          }

          function tryCapture() {
            var canvasResult = findQrCanvas();
            if (canvasResult) {
              postResult(canvasResult);
              return;
            }

            var images = collectImages();
            var qrImg = findQrImage(images);
            if (!qrImg) {
              log('img strategies skipped: no img candidate');
              trySvgCapture(function (svgData) {
                if (svgData) {
                  postResult(svgData);
                  return;
                }
                tryBackgroundCapture(function (bgData) {
                  postResult(bgData);
                });
              });
              return;
            }

            log('trying strategy img(data:)');
            if (qrImg.src && qrImg.src.indexOf('data:image') === 0) {
              log('strategy img(data:) success');
              postResult(qrImg.src);
              return;
            }
            log('strategy img(data:) failed: src not data uri');

            var canvasData = drawImgToCanvas(qrImg, 'img(drawImage)');
            if (canvasData) {
              postResult(canvasData);
              return;
            }

            reloadImgWithCors(qrImg, function (corsB64) {
              if (corsB64) {
                postResult(corsB64);
                return;
              }
              if (!qrImg.src) {
                log('img(fetch/xhr) skipped: no src');
                trySvgCapture(function (svgData) {
                  if (svgData) {
                    postResult(svgData);
                    return;
                  }
                  tryBackgroundCapture(function (bgData) {
                    postResult(bgData);
                  });
                });
                return;
              }
              fetchImageAsBase64(qrImg.src, function (fetchB64) {
                if (fetchB64) {
                  postResult(fetchB64);
                  return;
                }
                fetchImageNoCors(qrImg.src, function (xhrB64) {
                  if (xhrB64) {
                    postResult(xhrB64);
                    return;
                  }
                  trySvgCapture(function (svgData) {
                    if (svgData) {
                      postResult(svgData);
                      return;
                    }
                    tryBackgroundCapture(function (bgData) {
                      postResult(bgData);
                    });
                  });
                });
              });
            });
          }

          log('capture scheduled after 500ms');
          setTimeout(tryCapture, 500);

        } catch (e) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'qr_capture_result',
              image: null,
              price: 0,
              debug: 'outer catch: ' + (e && e.message ? e.message : String(e)) + ' | ' + debugLog.join(' | '),
            }));
          }
        }
        true;
      })();
    `;
  }

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as CaptureResult;
      if (msg.type === 'qr_capture_result') {
        console.log('[QR Capture Debug]', msg.debug);

        // Clear the safety timeout since we received a response
        if (captureTimeoutRef.current) {
          clearTimeout(captureTimeoutRef.current);
          captureTimeoutRef.current = null;
        }

        if (!msg.image) {
          Alert.alert(
            'Capture Failed',
            'Unable to capture the QR code. Please retry after the QR is fully visible.\nDebug: ' + (msg.debug || 'no debug info'),
          );
          setCapturing(false);
          return;
        }

        setCapturedImage(msg.image);
        setExtractedPrice(msg.price || 0);
        setQrCodeImage(msg.image);

        decodeQR(msg.image)
          .then((result) => {
            setDecodedData(result.decoded_data);
            setQrCodeData(result.decoded_data);
          })
          .catch(() => {
            setDecodedData(null);
            setQrCodeData(null);
          })
          .finally(() => {
            setShowPreview(true);
            setCapturing(false);
          });
      }
    } catch {
      // ignore non-JSON messages from the WebView
    }
  }, []);

  function handleDone() {
    if (capturing) {
      return;
    }

    if (!pageLoaded) {
      Alert.alert('Please Wait', 'The page is still loading.');
      return;
    }

    setCapturing(true);
    webViewRef.current?.injectJavaScript(buildCaptureScript());

    // Safety timeout: if no message received within 15s, reset state
    captureTimeoutRef.current = setTimeout(() => {
      captureTimeoutRef.current = null;
      setCapturing(false);
      Alert.alert(
        'Capture Timed Out',
        'Could not capture the QR code. Make sure the QR code is visible on the page, then try again.',
      );
    }, 15000);
  }

  function handleRetry() {
    setShowPreview(false);
    setCapturedImage(null);
    setDecodedData(null);
    setExtractedPrice(0);
  }

  function handleConfirm() {
    setShowPreview(false);
    navigation.navigate('OrderConfirm', {
      items: [],
      totalPrice: extractedPrice,
      canteen,
      qrCodeImage: capturedImage,
      qrCodeData: decodedData,
    });
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.header, { borderBottomColor: colors.sub }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {canteen}
        </Text>
        
        <TouchableOpacity onPress={handleDone} style={styles.headerButton}>
          <Text style={[styles.doneButtonText, { color: colors.accent }]}>Done</Text>
        </TouchableOpacity>
      </View>

      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <ActivityIndicator 
            style={[styles.loader, { backgroundColor: colors.bg }]} 
            size="large" 
            color={colors.accent} 
          />
        )}
        onLoadEnd={() => setPageLoaded(true)}
        onMessage={handleMessage}
        style={[styles.webView, { backgroundColor: colors.bg }]}
      />

      <Modal visible={showPreview} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.sub }]}> 
            <Text style={[styles.modalTitle, { color: colors.text }]}>QR Code Captured</Text>

            {capturedImage ? (
              <Image source={{ uri: capturedImage }} style={styles.previewImage} resizeMode="contain" />
            ) : (
              <View style={[styles.previewPlaceholder, { borderColor: colors.sub }]}> 
                <Text style={[styles.previewPlaceholderText, { color: colors.sub }]}>No image captured</Text>
              </View>
            )}

            {decodedData ? (
              <Text style={[styles.modalDetailText, { color: colors.text }]}>Data: {decodedData}</Text>
            ) : (
              <Text style={[styles.modalDetailText, { color: colors.sub }]}>Data: Not decoded</Text>
            )}

            {extractedPrice > 0 ? (
              <Text style={[styles.modalPriceText, { color: colors.accent }]}>Price: $ {extractedPrice.toFixed(2)}</Text>
            ) : (
              <Text style={[styles.modalPriceText, { color: colors.sub }]}>Price: Not found</Text>
            )}

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.retryButton, { borderColor: colors.sub }]}
                onPress={handleRetry}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Retry</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.accent }]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    zIndex: 1,
  },
  webView: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 12,
    padding: 20,
    borderWidth: 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  previewImage: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginBottom: 14,
  },
  previewPlaceholder: {
    width: 200,
    height: 200,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignSelf: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  previewPlaceholderText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalDetailText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  modalPriceText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 18,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  confirmButton: {
    borderWidth: 0,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
