// Läuft im Web Worker von LibreOffice (ZetaOffice) und führt die eigentliche Konvertierung aus.
import { ZetaHelperThread } from './vendor/zetajs/zetaHelper.js';

const zHT = new ZetaHelperThread();
const zetajs = zHT.zetajs;
const css = zHT.css;

const bean = (Name, Value) => new css.beans.PropertyValue({ Name, Value });
const loadProps = [bean('Hidden', true)];
const storeProps = [bean('Overwrite', true), bean('FilterName', 'Impress MS PowerPoint 2007 XML')];

zHT.thrPort.onmessage = (e) => {
  if (e.data.cmd !== 'convert') return;
  const { id, from, to } = e.data;
  let xModel;
  try {
    xModel = zHT.desktop.loadComponentFromURL('file://' + from, '_blank', 0, loadProps);
    if (!xModel) throw new Error('Datei konnte nicht geöffnet werden.');
    xModel.storeToURL('file://' + to, storeProps);
    zetajs.mainPort.postMessage({ cmd: 'converted', id, from, to });
  } catch (err) {
    let message = String(err?.message || err);
    try {
      const exc = zetajs.catchUnoException(err);
      if (exc?.Message) message = exc.Message;
    } catch {}
    zetajs.mainPort.postMessage({ cmd: 'error', id, from, message });
  } finally {
    try {
      if (xModel?.queryInterface(zetajs.type.interface(css.util.XCloseable))) xModel.close(true);
    } catch {}
  }
};

zHT.thrPort.postMessage({ cmd: 'ready' });
