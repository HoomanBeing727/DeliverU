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
import { OrderItem, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

type Props = NativeStackScreenProps<RootStackParamList, 'CanteenWebView'>;

export default function CanteenWebViewScreen({ navigation, route }: Props) {
  const { canteen, url } = route.params;
  const { user } = useAuth();
  const { showToast } = useToast();
  const webViewRef = useRef<WebView>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<OrderItem[]>([]);
  const [extractedPrice, setExtractedPrice] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const captureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownTakeawayToastRef = useRef(false);

  const isDark = user?.dark_mode ?? false;
  const colors = isDark
    ? { bg: '#1a1a2e', card: '#16213e', text: '#eee', sub: '#aaa', accent: '#0f3460' }
    : { bg: '#f5f5f5', card: '#fff', text: '#333', sub: '#666', accent: '#003366' };

  interface CaptureResult {
    type: string;
    image: string | null;
    price: number;
    debug?: string;
    url?: string;
    items?: { name: string; qty: number; price: number }[];
    cartTotal?: number;
    totalPrice?: number;
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
            // Strategy 0: Extract QR image URL directly (bypass CORS entirely)
            log('trying strategy url-extract');
            var selectors = [
              'img[src*="barcode"]',
              'img[src*="api.aigens.com"]',
              'app-img img',
              '.qr-scan-container img',
              'img[src*="qr"]',
            ];
            var qrUrl = null;
            for (var si = 0; si < selectors.length; si++) {
              try {
                var found = document.querySelectorAll(selectors[si]);
                log('selector "' + selectors[si] + '" matched ' + found.length + ' elements');
                for (var fi = 0; fi < found.length; fi++) {
                  var el = found[fi];
                  var src = el.getAttribute('src') || el.src || '';
                  if (src && src.indexOf('http') === 0 && src.length > 20) {
                    log('url-extract found: ' + shortUrl(src));
                    qrUrl = src;
                    break;
                  }
                }
                if (qrUrl) break;
              } catch (selErr) {
                log('selector "' + selectors[si] + '" error: ' + (selErr && selErr.message ? selErr.message : String(selErr)));
              }
            }

            if (qrUrl) {
              log('strategy url-extract success, posting URL to RN');
              var extractedItems = [];
              var cartTotal = 0;
              if (window.__extractedCartItems) {
                extractedItems = window.__extractedCartItems.items || [];
                cartTotal = window.__extractedCartItems.totalPrice || 0;
              }
              var urlMsg = JSON.stringify({
                type: 'qr_url_result',
                url: qrUrl,
                image: null,
                price: extractPrice(),
                items: extractedItems,
                cartTotal: cartTotal,
                debug: debugLog.join(' | '),
              });
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(urlMsg);
              }
              return;
            }
            log('strategy url-extract failed: no matching URL found');

            // Fallback: existing pixel-based strategies
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

  function buildCartExtractionScript(): string {
    return `
      (function () {
        try {
          var LOG_PREFIX = '[CartExtract]';
          var hasExtractedOnce = false;
          var visibilityPollTimer = null;
          var rescrapeInterval = null;
          var cartObserver = null;
          var bodyObserver = null;

          function debug(msg) {
            try {
              console.log(LOG_PREFIX, msg);
            } catch (_) {
              // no-op
            }
          }

          function parsePrice(text) {
            var cleaned = String(text || '').replace('$', '').trim();
            var value = parseFloat(cleaned);
            if (isNaN(value)) {
              return 0;
            }
            return value;
          }

          function parseQty(text) {
            var value = parseInt(String(text || '').trim(), 10);
            if (isNaN(value)) {
              return 0;
            }
            return value;
          }

          function postCartData(payload) {
            var safePayload = payload || { items: [], totalPrice: 0 };
            try {
              window.__extractedCartItems = safePayload;
            } catch (storageError) {
              debug('failed to store window.__extractedCartItems: ' + (storageError && storageError.message ? storageError.message : String(storageError)));
            }

            try {
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(
                  JSON.stringify({
                    type: 'cart_items_extracted',
                    items: safePayload.items,
                    totalPrice: safePayload.totalPrice,
                  }),
                );
              }
            } catch (postError) {
              debug('postMessage failed: ' + (postError && postError.message ? postError.message : String(postError)));
            }
          }

          function scrapeCart() {
            try {
              var items = [];
              var totalPrice = 0;

              // === Strategy 1: LG1 (csd.order.place) DOM ===
              var wrappers = document.querySelectorAll('.cart-item-wrapper');
              if (wrappers.length > 0) {
                debug('scrapeCart: using LG1 strategy (' + wrappers.length + ' wrappers)');
                for (var i = 0; i < wrappers.length; i++) {
                  var wrapper = wrappers[i];
                  var rows = wrapper.querySelectorAll('.main-item-row.main-item, .main-item-row.sub-item');

                  for (var j = 0; j < rows.length; j++) {
                    var row = rows[j];
                    var qtyEl = row.querySelector('.div-item-qty h4.item-qty');
                    var nameEl = row.querySelector('h4.item-name');
                    var priceEl = row.querySelector('h6.main-item-price-extra');
                    if (!priceEl) {
                      priceEl = row.querySelector('.cart-item-price h5.main-item-price');
                    }

                    var qty = parseQty(qtyEl ? qtyEl.textContent : '');
                    var name = nameEl ? String(nameEl.textContent || '').trim() : '';
                    var price = parsePrice(priceEl ? priceEl.textContent : '');

                    if (!name) continue;
                    items.push({ name: name, qty: qty, price: price });
                  }
                }

                var totalNode = document.querySelector('.div-prices .col-right h5');
                totalPrice = parsePrice(totalNode ? totalNode.textContent : '');
              }

              // === Strategy 2: Ionic (now.order.place) DOM — LSK / Asia Pacific ===
              if (items.length === 0) {
                var cartCards = document.querySelectorAll('ion-card.cart-list-box');
                if (cartCards.length > 0) {
                  debug('scrapeCart: using Ionic strategy (' + cartCards.length + ' cards)');
                  for (var ci = 0; ci < cartCards.length; ci++) {
                    var card = cartCards[ci];
                    var header = card.querySelector('ion-card-header.list-title-box');
                    if (!header) continue;

                    var cardNameEl = header.querySelector('p.title-text');
                    var cardQtyEl = header.querySelector('p.subset-qty-text');
                    var cardPriceEl = header.querySelector('p.price-text');

                    var cardName = cardNameEl ? String(cardNameEl.textContent || '').trim() : '';
                    var cardQty = parseQty(cardQtyEl ? cardQtyEl.textContent : '');
                    var cardPrice = parsePrice(cardPriceEl ? cardPriceEl.textContent : '');

                    // If qty came from header but is 0, check edit-box for qty
                    if (cardQty === 0) {
                      var editBox = card.querySelector('.edit-box .subset-qty-text p');
                      if (editBox) {
                        cardQty = parseQty(editBox.textContent);
                      }
                    }
                    if (cardQty === 0) cardQty = 1;

                    if (!cardName) continue;
                    items.push({ name: cardName, qty: cardQty, price: cardPrice });
                  }

                  // Total from footer button
                  var ftPriceEl = document.querySelector('.sendOrder-button p.priceText-text');
                  if (ftPriceEl) {
                    totalPrice = parsePrice(ftPriceEl.textContent);
                  }
                }
              }

              var payload = { items: items, totalPrice: totalPrice };
              debug('scraped items=' + items.length + ' totalPrice=' + totalPrice);
              postCartData(payload);
            } catch (scrapeError) {
              debug('scrapeCart failed: ' + (scrapeError && scrapeError.message ? scrapeError.message : String(scrapeError)));
              postCartData({ items: [], totalPrice: 0 });
            }
          }

          function findCartPage() {
            return document.querySelector('app-mobile-cart-page') || document.querySelector('cart-page');
          }

          function startRescrape() {
            if (rescrapeInterval) {
              return;
            }
            debug('start 2s re-poll while cart visible');
            rescrapeInterval = setInterval(function () {
              var cartPage = findCartPage();
              if (!cartPage) {
                if (rescrapeInterval) {
                  clearInterval(rescrapeInterval);
                  rescrapeInterval = null;
                }
                // Reset so we re-detect when user returns to cart
                hasExtractedOnce = false;
                debug('cart hidden, stop 2s re-poll, reset detection');
                return;
              }
              scrapeCart();
            }, 2000);
          }

          function attachCartObserver(cartPage) {
            if (!cartPage) {
              return;
            }

            if (cartObserver) {
              try {
                cartObserver.disconnect();
              } catch (_) {
                // no-op
              }
            }

            // LG1 uses .cart-item-container, Ionic uses .flex-content or the page itself
            var observeTarget = cartPage.querySelector('.cart-item-container')
              || cartPage.querySelector('.flex-content')
              || cartPage;
            cartObserver = new MutationObserver(function () {
              debug('cart mutation detected, re-scrape');
              scrapeCart();
            });

            cartObserver.observe(observeTarget, {
              childList: true,
              subtree: true,
              characterData: true,
            });

            debug('cart observer attached');
            scrapeCart();
            startRescrape();
          }

          function detectAndAttach() {
            var cartPage = findCartPage();
            if (!cartPage) {
              return false;
            }

            debug('cart page detected');
            hasExtractedOnce = true;
            attachCartObserver(cartPage);
            return true;
          }

          bodyObserver = new MutationObserver(function () {
            if (hasExtractedOnce) {
              return;
            }
            detectAndAttach();
          });

          if (document.body) {
            bodyObserver.observe(document.body, {
              childList: true,
              subtree: true,
            });
          }

          debug('init mutation observer + 1s polling fallback');
          visibilityPollTimer = setInterval(function () {
            if (hasExtractedOnce) return;
            detectAndAttach();
          }, 1000);

          // === Dine-in Blocker ===
          function blockDineIn() {
            if (window.__deliveru_dinein_blocker_initialized) return;
            window.__deliveru_dinein_blocker_initialized = true;

            var debounceTimer = null;

            function findTakeawayElement() {
              var all = document.querySelectorAll('div, button, span, a, li');
              for (var t = 0; t < all.length; t++) {
                var txt = (all[t].textContent || '').trim();
                if (txt === '\u5916\u8CE3' || txt === '\u5916\u5356') {
                  return all[t];
                }
              }
              return null;
            }

            function scanAndBlock() {
              try {
                var candidates = document.querySelectorAll('div, button, span, a, li');

                for (var i = 0; i < candidates.length; i++) {
                  var el = candidates[i];
                  var text = (el.textContent || '').trim();

                  // Block dine-in clicks
                  if ((text === '\u5802\u98DF' || text.indexOf('\u5802\u98DF') !== -1) && text.length <= 6) {
                    if (!el.dataset.deliveruDineinBound) {
                      el.dataset.deliveruDineinBound = '1';
                      (function (elem) {
                        elem.addEventListener('click', function (event) {
                          event.preventDefault();
                          event.stopPropagation();
                          event.stopImmediatePropagation();
                          debug('Blocked dine-in click');

                          // Notify RN to show warning toast
                          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dine_in_blocked' }));
                          }

                          // Auto-click takeaway
                          var twEl = findTakeawayElement();
                          if (twEl && typeof twEl.click === 'function') {
                            setTimeout(function () {
                              try { twEl.click(); } catch (_) {}
                            }, 150);
                          }
                        }, true);
                      })(el);
                    }
                  }

                  // Track user-initiated takeaway clicks
                  if ((text === '\u5916\u8CE3' || text.indexOf('\u5916\u8CE3') !== -1 || text === '\u5916\u5356' || text.indexOf('\u5916\u5356') !== -1) && text.length <= 6) {
                    if (!el.dataset.deliveruTakeawayBound) {
                      el.dataset.deliveruTakeawayBound = '1';
                      (function (elem) {
                        elem.addEventListener('click', function (event) {
                          if (typeof event.isTrusted === 'boolean' && !event.isTrusted) return;
                          if (window.__deliveru_takeaway_selected_sent) return;
                          window.__deliveru_takeaway_selected_sent = true;
                          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                            debug('Takeaway selected by user');
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'takeaway_selected' }));
                          }
                        }, true);
                      })(el);
                    }
                  }
                }
              } catch (blockErr) {
                debug('dine-in blocker error: ' + (blockErr && blockErr.message ? blockErr.message : String(blockErr)));
              }
            }

            // Debounced observer — fires scanAndBlock at most once per 300ms
            var observer = new MutationObserver(function () {
              if (debounceTimer) return;
              debounceTimer = setTimeout(function () {
                debounceTimer = null;
                scanAndBlock();
              }, 300);
            });

            // Observe body only, childList + subtree (NO attributes — avoids excessive firing)
            if (document.body) {
              observer.observe(document.body, {
                childList: true,
                subtree: true,
              });
            }

            // Initial scan
            scanAndBlock();
            debug('dine-in blocker initialized');
          }

          blockDineIn();

          detectAndAttach();
        } catch (e) {
          try {
            console.log('[CartExtract]', 'outer catch', e && e.message ? e.message : String(e));
          } catch (_) {
            // no-op
          }
        }
        true;
      })();
    `;
  }

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as CaptureResult;

      // Strategy 0 hit: we got a URL, fetch the image from RN side (no CORS!)
      if (msg.type === 'qr_url_result' && msg.url) {
        console.log('[QR URL Extract Debug]', msg.debug);
        console.log('[QR URL]', msg.url);

        if (msg.items && typeof msg.cartTotal === 'number') {
          setExtractedItems(msg.items);
          setExtractedPrice(msg.cartTotal);
        }

        // Clear the safety timeout since we received a response
        if (captureTimeoutRef.current) {
          clearTimeout(captureTimeoutRef.current);
          captureTimeoutRef.current = null;
        }

        // Fetch image from React Native side — bypasses WebView CORS entirely
        fetch(msg.url)
          .then((response) => {
            if (!response.ok) {
              throw new Error('HTTP ' + response.status);
            }
            return response.blob();
          })
          .then((blob) => {
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                  resolve(reader.result);
                } else {
                  reject(new Error('FileReader result is not a string'));
                }
              };
              reader.onerror = () => reject(new Error('FileReader error'));
              reader.readAsDataURL(blob);
            });
          })
          .then((base64Image) => {
            console.log('[QR URL Fetch] Got base64, length:', base64Image.length);
            setCapturedImage(base64Image);
            const resolvedPrice = typeof msg.cartTotal === 'number' ? msg.cartTotal : (msg.price || 0);
            setExtractedPrice(resolvedPrice);
            setQrCodeImage(base64Image);

            setQrCodeData(null);
          })
          .then(() => {
            setShowPreview(true);
            setCapturing(false);
          })
          .catch((fetchErr) => {
            console.log('[QR URL Fetch Error]', fetchErr);
            Alert.alert(
              'Capture Failed',
              'Found QR URL but failed to download image: ' + String(fetchErr),
            );
            setCapturing(false);
          });

        return;
      }

      if (msg.type === 'cart_items_extracted') {
        const items = msg.items || [];
        const totalPrice = msg.totalPrice || 0;
        setExtractedItems(items);
        setExtractedPrice(totalPrice);
        console.log('[Cart Extract] Got items:', items.length);
        return;
      }

      if (msg.type === 'takeaway_selected') {
        if (!hasShownTakeawayToastRef.current) {
          showToast('This app only supports takeaway orders.', 'warning');
          hasShownTakeawayToastRef.current = true;
        }
        return;
      }

      if (msg.type === 'dine_in_blocked') {
        if (!hasShownTakeawayToastRef.current) {
          showToast('This app only supports takeaway orders. Takeaway has been selected for you.', 'warning');
          hasShownTakeawayToastRef.current = true;
        }
        return;
      }

      // Existing pixel-based capture result
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

        setQrCodeData(null);
        setShowPreview(true);
        setCapturing(false);
      }
    } catch {
      // ignore non-JSON messages from the WebView
    }
  }, [showToast]);

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
    setExtractedItems([]);
    setExtractedPrice(0);
  }

  function handleConfirm() {
    setShowPreview(false);
    navigation.navigate('OrderConfirm', {
      items: extractedItems,
      totalPrice: extractedPrice,
      canteen,
      qrCodeImage: capturedImage,
      qrCodeData: null,
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
        injectedJavaScriptBeforeContentLoaded={buildCartExtractionScript()}
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

            <Text style={[styles.modalDetailText, { color: colors.text }]}>QR Code ready for deliverer</Text>

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
