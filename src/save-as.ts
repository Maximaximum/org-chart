/** This function invokes save window */
export function saveAs(uri: string, filename: string) {
  // create link
  var link = document.createElement('a');
  if (typeof link.download === 'string') {
    document.body.appendChild(link); // Firefox requires the link to be in the body
    link.download = filename;
    link.href = uri;
    link.click();
    document.body.removeChild(link); // remove the link when done
  } else {
    location.replace(uri);
  }
}
