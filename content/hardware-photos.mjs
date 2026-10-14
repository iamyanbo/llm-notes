// Real photographs, credited beside each image. See hardware-photo-provenance.md.
const commons=title=>'https://commons.wikimedia.org/wiki/'+encodeURIComponent('File:'+title);
export const hardwarePhotos={
 grid:{file:'grid-switchyard.png',width:1280,height:960,title:'Switchyard of electric substation 750kV.png',author:'Novoklimov',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0',
  alt:'Overhead conductors, steel supports, and insulators in a high-voltage electrical switchyard.',
  caption:'A 750 kV switchyard: conductors carry electricity across the site, while insulators separate them from the supporting steel. A large computing facility needs access to grid infrastructure as well as generators. This photograph shows a grid installation, not a particular AI datacentre.'},
 transistor:{file:'transistor-replica.jpg',width:1280,height:2149,title:'A replica of the first working transistor.jpg',author:'Mister rf',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0',
  alt:'A replica of the first working transistor, with a spring, fine wires, and a small contact assembly beneath a glass dome.',
  caption:'A replica of the first working transistor, developed at <a href="https://www.nokia.com/bell-labs/about/history/">Bell Labs in 1947</a>. A single experimental device required this assembly of contacts and supports.'},
 die:{file:'p100-die.jpg',width:1280,height:720,title:'Nvidia@16nm@Pascal@GP100@Tesla P100@T Taiwan 1912A1 PN9G70.S6W GP100-897-A1 DSC06755-DSC06929.jpg',author:'Fritzchens Fritz',license:'CC0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',
  alt:'A bare NVIDIA GP100 GPU die, photographed at an angle, with repeated circuit regions visible across its surface.',
  caption:'A bare GP100 GPU die from a Tesla P100. The repeating regions are groups of circuitry; individual transistors are too small to distinguish at this magnification. The two photographs are shown at different scales.'},
 wafer:{file:'silicon-wafer.jpg',width:1280,height:960,title:'Silicon wafer close view.jpg',author:'Le hollandais volant',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0',
  alt:'Close-up of a silicon wafer with rectangular chip patterns repeated across its reflective surface.',
  caption:'Look for the repeated rectangular patterns across this wafer. Many chips are processed together before the wafer is cut into individual dies; a finished GPU does not begin as an isolated piece of silicon.'},
 package:{file:'p100-infrared.jpg',width:1280,height:820,title:'Nvidia@16nm@Pascal@GP100@Tesla P100@T Taiwan 1912A1 PN9G70.S6W GP100-897-A1 DSCx01@SWIR.jpg',author:'FritzchensFritz',license:'CC0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',
  alt:'Infrared photograph of a Tesla P100 package, with a large GPU die in the centre and four smaller HBM stacks, two on either side.',
  caption:'An infrared photograph of a Tesla P100 package. The large central rectangle is the GPU; the four smaller rectangles beside it are <a href="https://developer.nvidia.com/blog/inside-pascal/">HBM2 memory stacks</a>. This older device makes the physical arrangement especially easy to see. The memory stacks share the package with the GPU, rather than sitting elsewhere in the server.'},
 gpu:{file:'h100-installed.png',width:1280,height:720,title:'NVIDIA H100 (极客湾Geekerwan) 027.png',author:'Geekerwan',license:'CC BY 3.0',licenseUrl:'https://creativecommons.org/licenses/by/3.0',
  alt:'Four NVIDIA H100 PCIe cards mounted beside one another, with gold cooling fins and their brackets visible.',
  caption:'Four H100 PCIe cards installed together. The gold fins belong to the cooling assemblies; the silicon and its nearby memory are hidden underneath. These PCIe cards differ from the H100 SXM configuration in the specifications below. The animation opens a simplified view of the parts inside the package.',medium:'Video frame'},
 cluster:{file:'summit-racks.jpg',width:1280,height:720,title:'Summit Supercomputer 2018.jpg',author:'OLCF at ORNL',license:'CC BY 2.0',licenseUrl:'https://creativecommons.org/licenses/by/2.0',
  alt:'Rows of black and blue Summit supercomputer cabinets at Oak Ridge, with overhead cable trays and a service aisle.',
  caption:'Summit at Oak Ridge National Laboratory, photographed in 2018. Rows of cabinets and overhead cable trays occupy a whole machine room. <a href="https://www.olcf.ornl.gov/summit/">Summit</a> is a real GPU-based supercomputer; the drawing below explains how servers and racks fit together, using illustrative counts rather than Summit’s configuration.'}
};

export function hardwarePhoto(key){
 const item=hardwarePhotos[key];
 return `<figure class="essay-figure hardware-photo"><img src="images/${item.file}" width="${item.width}" height="${item.height}" alt="${item.alt}" loading="lazy" decoding="async"><figcaption>${item.caption}<span class="photo-credit">${item.medium||'Photograph'}: ${item.author} · <a href="${commons(item.title)}">Source</a> · <a href="${item.licenseUrl}">${item.license}</a></span></figcaption></figure>`;
}

export const transistorPhotographs=()=>`<div class="hardware-photo-pair">${hardwarePhoto('transistor')}${hardwarePhoto('die')}</div>`;
