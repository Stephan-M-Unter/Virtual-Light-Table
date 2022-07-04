const url = "https://vlt.museoegizio.it/imgpx/L21lZGlhL2NlOWRmYzk5MzZkYTRjODNiOTdhM2QxOTVjMWRhZmZhL1tRMUF3TURsZk1EVTNYM0owTG5ScFpnXSgxKS5qcGc";
console.log(url);

fetch(url, {mode: 'no-cors'})
    .then(resp => {
        console.log(resp);
    });/*
    .then(blob => {
        const url2 = URL.createObjectURL(blob);
        document.getElementById('preview').src = url2;
    });


/*
fetch(API_URL)
  .then(resp => resp.data.blob())
  .then(blob => {
    const url = URL.createObjectURL(blob);
    document.getElementById("preview").src = url;
  });
*/