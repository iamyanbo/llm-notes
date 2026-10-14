import {p,section,cite,figure,table,demo} from './essay-helpers.mjs';
import {hardwarePhoto,transistorPhotographs} from './hardware-photos.mjs';

export const hardwareSection={
 'energy-for-compute':{flat:true,refs:['energyDemand','energySupply','homes','powerAgreement'],sections:[
  section('units','',
   p('Consider a training run that keeps a datacentre busy for a month. Every operation consumes energy, and the machines continue to need electricity while they wait for memory or for one another. Cooling removes the heat they produce. Before we can ask how much a larger model might learn, we must obtain the electricity to run the experiment.'),
   p('For a little <strong>napkin math</strong>, suppose a 100-megawatt facility draws its full load throughout a day. One hundred megawatts is 100 million watts, and twenty-four hours at that rate uses <strong>100 × 24 = 2,400 MWh</strong>, or 2.4 million kilowatt-hours. At an assumed electricity price of $0.10 per kWh, the bill would be <strong>$240,000 a day</strong>—about $7.2 million over thirty days.'),
   p('For a household reference, '+cite('homes','the U.S. EIA reports')+' average purchases of 10,791 kWh per residential utility customer in 2022. Running at 100 MW for a year uses 876 million kWh—roughly the annual electricity purchases of <strong>81,000 such households</strong>. This compares annual energy, not the peak demand of 81,000 homes.')),
  section('supply','',
   p('The supply has to reach the site throughout the run. Building a datacentre therefore involves a grid connection, transmission capacity, and dependable generation as well as the servers. A site can have room for racks and still be unable to power them. '+cite('energySupply','The IEA’s analysis')+' examines these constraints and the different generation sources used to meet AI demand.'),
   p('This is why labs and their infrastructure partners negotiate power supply years ahead. Google’s '+cite('powerAgreement','2024 agreement with Kairos Power')+' envisaged up to <strong>500 MW</strong> from small modular nuclear reactors—five times our 100 MW reference facility. It targeted the first reactor by 2030 and additional deployments through 2035. These were development commitments, not reactors already supplying that power when the agreement was announced. Wind and solar generation vary with conditions; dependable supply for a continuous run also requires the wider grid, storage, or other generation to balance that variation.'),
   p('We will return to the size of those commitments after following the machines that consume the power. Their arithmetic begins with a very small device: the transistor.'))
 ]},
 'hardware-development':{flat:true,refs:['transistors','moore','dennard','hopper'],sections:[
  section('transistors','',
   p('A <strong>transistor</strong> lets an electrical signal control current through a circuit. In a digital chip, circuits use two distinguishable voltage ranges to represent 0 and 1. Arrangements of transistors combine these values to perform logical operations; larger arrangements implement arithmetic and retain the numbers needed for the next operation.'),
   p('A matrix multiplication in an LLM is performed by these circuits. The equation does not specify how many arithmetic units the machine has, how quickly they switch, or how much storage sits beside them. Those choices determine how long it takes to perform the calculation.'),
   p(cite('transistors','ASML’s introduction to microchips')+' describes how transistors and their connections are formed together on silicon. Modern chips contain billions of them. For a concrete example, NVIDIA’s '+cite('hopper','H100 architecture account')+' gives approximately <strong>80 billion transistors</strong> in its GPU die. They are not all arithmetic units: the chip also needs memory, control circuitry, and paths carrying data.')),
  section('scaling','',
   transistorPhotographs(),
   p('Smaller transistors leave room for more circuitry in a given area. '+cite('moore','Moore’s 1965 observation')+' described the rapid increase in the economically favorable number of components on an integrated circuit. For many years, shrinking devices also allowed higher switching rates while voltages fell. '+cite('dennard','Dennard’s scaling analysis')+' explains the physical assumptions behind that combination.'),
   p('Voltage reduction eventually became harder to sustain. Switching ever more circuitry ever faster would produce more heat than the package could remove. Designers could still use additional transistors, but had to find useful work that could be performed in parallel and decide which parts of the chip should be active.'),
   p('Before considering those designs, there is a manufacturing question. How do we make billions of such devices and their connections small enough, accurately enough, and in enough copies to build these machines?'))
 ]},
 'chip-manufacturing':{flat:true,refs:['fabrication','lightSource','euv','processNames','packaging','tsmcPhotos'],sections:[
  section('design','',
   p('The circuit is formed in layers on a silicon <strong>wafer</strong>, with many copies of the chip design placed across its surface. Each layer must align with the layers already present. <strong>Lithography</strong> uses light to reproduce a pattern in a photosensitive coating; subsequent processing forms the corresponding features in the material beneath it.'),
   hardwarePhoto('wafer'),
   figure('images/asml-nxe3800e-fully-assembled-0074.jpg','A worker beside the exposed machinery of an ASML NXE:3800E EUV lithography system.','An ASML TWINSCAN NXE:3800E in Veldhoven, with its machinery exposed. The worker at the left gives a sense of scale: making microscopic patterns requires a room-sized system of light sources, optics, and precise positioning. Photograph: Michel de Heer / ©ASML. <a href="https://ourbrand.asml.com/web/ffdedecebf4d8fe6/asml-com---our-technology/?mediaId=CDDAC2C3-68EB-4991-96C1145FD8C660B6">Official asset record</a>; editorial use under <a href="https://investor.asml.com/news/media-library">ASML’s conditions</a>.')),
  section('pattern','',
   p('Inside an EUV light source, a preparatory laser pulse flattens a tiny tin droplet. A stronger pulse turns it into a plasma that emits extreme-ultraviolet light. '+cite('lightSource','ASML describes')+' droplets about <strong>25 micrometres</strong> across and an NXE source repeating the process <strong>50,000 times a second</strong>. The light used for exposure has wavelength <strong>13.5 nanometres</strong>.'),
   p('The light reflects from a patterned mask, and '+cite('euv','a system of mirrors')+' projects the reduced pattern onto the coated wafer. EUV is absorbed by air, so the light travels through a vacuum. Producing the light is one engineering problem; keeping the pattern sharp and aligned as the wafer moves is another.')),
  section('package','',
   p('After many processing and testing steps, the wafer is divided into individual chips. A chip must then be connected to power, memory, and the rest of the machine. For a GPU intended for AI workloads, <strong>packaging</strong> can bring stacks of high-bandwidth memory close to the logic, with many short connections carrying the numbers used in the calculation.'),
   hardwarePhoto('package'),
   p(cite('packaging','TSMC’s CoWoS technology')+' is an example of this assembly. Producing logic, producing memory, and joining them are separate manufacturing tasks. A shortage of packaging capacity can consequently delay a finished GPU even when its logic chips are available.'),
   p('There is much more engineering here than we need to follow the LLM calculation. If this part catches your interest, '+cite('fabrication','ASML’s manufacturing account')+' follows the processing steps, and '+cite('tsmcPhotos','TSMC’s fab photographs')+' show the facilities that carry them out. We now turn to what the finished GPU does with the data.'))
 ]},
 gpu:{flat:true,refs:['gpu','hopper','h100','mi300','cuda','amd'],sections:[
  section('work','',
   p('A <strong>GPU</strong> provides many execution resources for calculations that can be divided into similar pieces. Graphics supplied an early reason to build this kind of machine: many pixels and geometric elements need related operations. Neural networks also offer large amounts of repeated arithmetic, especially matrix multiplication. A GPU used for this work is often called an <strong>accelerator</strong>; the term also includes other devices specialized for particular calculations.'),
   p('The processor needs both the numbers and the instructions describing what to do with them. High-bandwidth memory, or <strong>HBM</strong>, holds weights and working data beside the compute die. On-chip caches retain frequently used data. Smaller storage close to the arithmetic allows a group of threads to reuse values instead of repeatedly fetching them from HBM.'),
   hardwarePhoto('gpu'),
   demo('gpu-inside','Inside a GPU: follow one tile').replace('A worked example','Data flow')),
  section('movement','',
   p('Use the exploded view to separate the package’s memory and compute components. The trace follows one illustrative matrix tile: inputs become available in HBM, are loaded through cache, and are staged in shared memory and registers for arithmetic. The resulting tile is written back to device memory. It can feed another GPU operation there; returning it to the CPU requires a separate copy.'),
   p('NVIDIA calls its cooperating execution groups <strong>streaming multiprocessors</strong>, or SMs, and provides Tensor Cores for matrix operations. AMD uses compute units and Matrix Cores. These are architectural differences behind a similar need: supply the arithmetic with operands and retain the results. '+cite('hopper','The Hopper architecture description')+' shows the NVIDIA organization in more detail.'),
   table(['Device','Device memory','Published memory bandwidth'],[
    [cite('h100','NVIDIA H100 SXM'),'80 GB HBM3','3.35 TB/s'],
    [cite('mi300','AMD Instinct MI300X'),'192 GB HBM3','5.3 TB/s']
   ],'Two disclosed accelerator configurations'),
   p('Capacity determines how much data can be held; bandwidth describes the rate at which it can be transferred. A 70-billion-parameter model stored at two bytes per weight needs <strong>140 GB for weights alone</strong>. This exceeds the H100 configuration’s 80 GB, but is within the MI300X’s 192 GB before accounting for working memory and request state. More bandwidth can help supply repeated reads. The published bandwidths are peaks, not measurements of an LLM’s token rate.')),
  section('vendor','',
   '<span id="cuda"></span><span id="vram"></span>',
   p('<strong>CUDA</strong> is NVIDIA’s programming platform; '+cite('amd','ROCm')+' is AMD’s ecosystem. A framework such as PyTorch uses libraries and compiled kernels to request operations from the device. The host program launches the work, and the GPU executes the kernel. Data does not pass out of the chip “into CUDA”: CUDA helps specify and launch the computation in the first place.'),
   p('Writing a good kernel includes choosing how threads share data, which values to retain, and when they must wait for one another. '+cite('cuda','The CUDA guide')+' develops those choices. Here, the important connection is between the program and the movement visible inside the machine. Even a fast GPU cannot perform an operation whose data has not yet arrived.'),
   p('A large training run can need more memory and more arithmetic than one GPU supplies. Adding devices also adds a new requirement: the devices must exchange information quickly enough to work on the same model.'))
 ]},
 'distributed-training':{flat:true,refs:['distributed','gpu','metaInfra'],sections:[
  section('reason','',
   p('Consider expanding a run from one GPU to a server with eight. One arrangement gives each GPU different training examples and keeps a model copy on every device. After computing its contribution to the update, each device exchanges the information needed to keep those copies consistent. Another arrangement divides the model itself, so intermediate results must move between devices.'),
   p('The server therefore needs fast local links as well as the GPUs. Several servers add network adapters and switches. Racks need power distribution and cooling, and the training program needs storage from which to read examples and save checkpoints. The <strong>cluster</strong> is this connected system working together, not merely the number of GPUs purchased.'),
   hardwarePhoto('cluster')),
  section('time','',
   p('With eight GPUs per server, 128 servers contain <strong>1,024 GPUs</strong>. If each device averaged 0.7 kW, the GPUs alone would draw roughly <strong>717 kW</strong>. CPUs, memory, networking, storage, and cooling add to that total. This small calculation connects the device we have just examined to the facility’s electricity requirement.'),
   p('More devices do not automatically shorten a run in the same proportion. A device can finish its local work and then wait for results from others. A slow link, an uneven workload, or a failed server can hold up the update. '+cite('distributed','PyTorch’s distributed-training overview')+' distinguishes the ways a program divides its examples and model across the cluster.'),
   p('At larger scales the organization may extend beyond one building. '+cite('metaInfra','Meta’s September 2025 infrastructure account')+' described its planned 1 GW Prometheus cluster spanning several buildings and adjacent facilities. The network and training software must make those separated machines useful to a single run.'))
 ]},
 'compute-infrastructure':{flat:true,refs:['computeRace','metaInfra','energySupply','packaging'],sections:[
  section('resource','',
   p('A lab planning its next model needs access to a working cluster for long enough to train it. Buying accelerators, renting a cloud cluster, and partnering with an infrastructure operator are different ways of obtaining that access. Each depends on devices, network capacity, a suitable site, and electricity being available together.'),
   p('These requirements have become the subject of very large commitments. In '+cite('computeRace','its September 2025 Stargate announcement')+', OpenAI described nearly <strong>7 GW of planned capacity</strong> and more than <strong>$400 billion of investment over three years</strong>, against an overall $500 billion, 10 GW commitment. The announcement also said early training and inference workloads had begun at Abilene. The full planned capacity and that operating site were different stages of the project.')),
  section('evidence','',
   table(['Published plan','Capacity described','100 MW facility equivalents'],[
    ['Stargate, September 2025','Nearly 7 GW planned','About 70'],
    ['Prometheus, Meta’s September 2025 account','1 GW planned','10'],
    ['Hyperion, the same Meta account','Able to scale to 5 GW; opening expected from 2028','50']
   ],'The scale of announced capacity, using the energy example as a reference'),
   p(cite('metaInfra','Meta’s account')+' placed Hyperion on a longer development schedule than Prometheus. A gigawatt is 1,000 megawatts, so these plans concern facilities much larger than our opening 100 MW example. If a full 7 GW were drawn continuously for a year, it would consume roughly <strong>61 TWh</strong>. That is a scale comparison, not a report of Stargate’s actual electricity consumption.'),
   p('Securing this capacity means reserving more than chips. Infrastructure partners arrange land, grid connections, buildings, cooling, equipment delivery, and financing. The delivery schedules can become bottlenecks: an installed rack waiting for a power connection cannot yet train a model. Manufacturing limits, including the availability of memory and packaging, can delay the hardware before it reaches the site.')),
  section('use','',
   p('For a new lab, renting capacity can make an experiment possible without first building a datacentre. A long commitment can secure availability, but it also commits the lab to paying for access even if its plans change. Operating its own system brings control over the equipment and schedule, together with the responsibility for keeping it useful.'),
   p('The competition for compute is consequently a competition over which experiments can be attempted, when, and by whom. We have followed one chain from electricity to transistors, manufactured chips, GPUs, and connected clusters. The next question is whether a larger experiment produces enough improvement to justify the resources it consumes. That is where scaling laws become useful.'))
 ]}
};
