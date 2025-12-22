
import { Plant } from './types';

export const MOCK_PLANTS: Plant[] = [
  {
    id: '1',
    name: 'Monstera Deliciosa',
    scientificName: 'Monstera deliciosa',
    location: 'Salón Principal',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDInEji3GaT5uelHTbEOtnAD3eF_ktI_FG5ir1me37y3x9Sn4EsvF27ywlNTyIDOXPDBWMm_FfN3wSeElY2FtQVEn04eddo-6Upv-BCMiV39hYOWob5gqXl0nqcj-aez_tYBUkE4UL0Kjo-rc8jz_pEZX9VegXIkBPMBuaS0E6qnh4tdPcSK3l6hjX8YKzRVB5jbROW763TtmjjROoJMoKbimLYISSiMtCZI4OAnl5p-Z_14CeMq1cV1GcNM_22Dx7_mIQxDN-tlo8',
    status: 'healthy',
    isToxic: true,
    needsWater: false,
    careDetails: {
      light: 'Indirecta',
      water: 'Media',
      temp: '20°C',
      humidity: 'Alta'
    },
    nextWatering: 'En 4 días'
  },
  {
    id: '2',
    name: 'Sansevieria',
    scientificName: 'Dracaena trifasciata',
    location: 'Dormitorio',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA5ZSGynMX48_bpMWP4L1_tBqC0pMuCzUOXjzWJio2Ckwf8sb8mmxzXuc1jAQd2GHodFHMdFPNcXtWa0zFUDjCoQSdl2M3d-TVtjDlwuQ5FQcVC_vTH2Z8X4YLkCkL9bvlHOYI-_sUCjDbkaEtoKdldeNiEBnzDB31ntSLUOOdk8GtzZ184Hqe-aNrxKkyVzayERIuyTzHYZIp6tjNTJkQSsH2mRFIXwe7CsHUHpBBt7GPPLqcXw-fdPQCmYgkHko0WGn8YqXPV6YE',
    status: 'warning',
    isToxic: false,
    needsWater: true,
    careDetails: {
      light: 'Baja luz',
      water: 'Baja',
      temp: '15-30°C',
      humidity: 'Baja'
    },
    nextWatering: 'Riego hoy'
  },
  {
    id: '3',
    name: 'Ficus Lyrata',
    scientificName: 'Ficus lyrata',
    location: 'Oficina',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCV02aOBQ7Fo9RGFbvdoXVUEUZLVgoaS_u0SliqIQY44m6euQsqvxmYv02Mf0JtYVFFM2EnJ5Cfklx3aWYCuhZefJtsqXWCr83c1lQ7_ER-uwYxz5zaGR8ltlNCZKfp5xNjgIZmUd9o6MtuJRFZ_Oe57vChwMVXRvVOctxfb5n8ur4sFPJO_vIm9qJuP3VjHJsCzeU0pjPOA5l3jo_m5qsurVp4m7kFZHajpQ1cOns-E4VJCgfXQKv9i3_K8ZvP6eNxaR4xiJfMfzY',
    status: 'healthy',
    isToxic: true,
    needsWater: false,
    careDetails: {
      light: 'Mucha luz',
      water: 'Cada 7 días',
      temp: '18-24°C',
      humidity: 'Media'
    },
    nextWatering: 'En 6 días'
  }
];
