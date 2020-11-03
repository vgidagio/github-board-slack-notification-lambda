function splitProcessor(
  text,
  transform,
  splitter,
) {
  const hunks = text.split(splitter);
  for (let i = 0; i < hunks.length; i += 2) {
    hunks[i] = transform(hunks[i]);
  }
  return hunks.join('');
}

function escape(text) {
  if (text) {
    const entify = (i) =>
      i
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const htmlEntities = /(&(?:\w+|#\d+);)/;
    return splitProcessor(text, entify, htmlEntities);
  } else {
    return '';
  }
}

function url(fullUrl, label) {
  if (fullUrl && label) {
    return `<${fullUrl}|${escape(label)}>`;
  } else if (fullUrl) {
    return `<${fullUrl}>`;
  } else {
    return "";
  }
}

module.exports.escape = escape;
module.exports.url = url;
