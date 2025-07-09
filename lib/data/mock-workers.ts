import { WorkerProfile } from "@/lib/types/marketplace";

export const mockWorkers: WorkerProfile[] = [
  {
    id: "worker_1",
    userId: "user_1",
    displayName: "Sarah Johnson",
    bio: "Professional cleaner with 5+ years experience in residential and commercial cleaning. I take pride in delivering spotless results and maintaining high standards.",
    profileImage: "",
    location: {
      address: "Victoria Island, Lagos",
      city: "Lagos",
      state: "Lagos",
      coordinates: {
        lat: 6.4281,
        lng: 3.4219
      }
    },
    categories: ["cleaning", "house-cleaning", "office-cleaning"],
    skills: ["Deep Cleaning", "Window Cleaning", "Carpet Cleaning", "Kitchen Sanitization"],
    languages: ["English", "Yoruba"],
    experience: {
      years: 5,
      description: "Started as a part-time cleaner while in university, now running my own cleaning service with a team of 3 professionals."
    },
    pricing: {
      hourlyRate: 2500,
      minimumHours: 2,
      currency: "NGN"
    },
    availability: {
      workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      workingHours: {
        start: "08:00",
        end: "18:00"
      },
      timezone: "Africa/Lagos"
    },
    verification: {
      isVerified: true,
      idVerified: true,
      backgroundCheck: true,
      verifiedAt: "2024-01-15T10:00:00Z"
    },
    rating: {
      average: 4.9,
      totalReviews: 127
    },
    stats: {
      completedJobs: 245,
      responseTime: 15,
      rehireRate: 89
    },
    preferences: {
      maxRadius: 25,
      acceptsLastMinute: true,
      acceptsWeekends: true
    },
    isActive: true,
    createdAt: "2023-08-01T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z"
  },
  {
    id: "worker_2",
    userId: "user_2",
    displayName: "Michael Chen",
    bio: "Reliable delivery and personal assistant services. I handle grocery shopping, package delivery, and various errands with efficiency and care.",
    profileImage: "",
    location: {
      address: "Wuse 2, Abuja",
      city: "Abuja",
      state: "FCT",
      coordinates: {
        lat: 9.0765,
        lng: 7.3986
      }
    },
    categories: ["delivery", "shopping", "grocery-shopping", "package-delivery"],
    skills: ["Package Handling", "Grocery Shopping", "Time Management", "Customer Service"],
    languages: ["English", "Mandarin"],
    experience: {
      years: 3,
      description: "Former logistics coordinator who decided to offer personalized delivery and shopping services to busy professionals."
    },
    pricing: {
      hourlyRate: 3000,
      minimumHours: 1,
      currency: "NGN"
    },
    availability: {
      workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      workingHours: {
        start: "07:00",
        end: "20:00"
      },
      timezone: "Africa/Lagos"
    },
    verification: {
      isVerified: true,
      idVerified: true,
      backgroundCheck: true,
      verifiedAt: "2023-12-10T09:00:00Z"
    },
    rating: {
      average: 4.8,
      totalReviews: 89
    },
    stats: {
      completedJobs: 156,
      responseTime: 8,
      rehireRate: 85
    },
    preferences: {
      maxRadius: 30,
      acceptsLastMinute: true,
      acceptsWeekends: true
    },
    isActive: true,
    createdAt: "2023-09-15T00:00:00Z",
    updatedAt: "2024-01-18T00:00:00Z"
  },
  {
    id: "worker_3",
    userId: "user_3",
    displayName: "Adaora Okafor",
    bio: "Certified childcare provider and elderly companion. I offer compassionate care with over 8 years of experience in healthcare and childcare.",
    profileImage: "",
    location: {
      address: "Ikeja, Lagos",
      city: "Lagos",
      state: "Lagos",
      coordinates: {
        lat: 6.6018,
        lng: 3.3515
      }
    },
    categories: ["childcare", "petcare"],
    skills: ["Child Development", "First Aid", "Elderly Care", "Pet Training", "Medication Management"],
    languages: ["English", "Igbo"],
    experience: {
      years: 8,
      description: "Registered nurse who specializes in childcare and elderly care. I hold certifications in pediatric first aid and geriatric care."
    },
    pricing: {
      hourlyRate: 4000,
      minimumHours: 3,
      currency: "NGN"
    },
    availability: {
      workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      workingHours: {
        start: "06:00",
        end: "22:00"
      },
      timezone: "Africa/Lagos"
    },
    verification: {
      isVerified: true,
      idVerified: true,
      backgroundCheck: true,
      verifiedAt: "2023-11-20T08:00:00Z"
    },
    rating: {
      average: 5.0,
      totalReviews: 203
    },
    stats: {
      completedJobs: 312,
      responseTime: 5,
      rehireRate: 95
    },
    preferences: {
      maxRadius: 20,
      acceptsLastMinute: false,
      acceptsWeekends: false
    },
    isActive: true,
    createdAt: "2023-06-01T00:00:00Z",
    updatedAt: "2024-01-22T00:00:00Z"
  },
  {
    id: "worker_4",
    userId: "user_4",
    displayName: "David Adebayo",
    bio: "Skilled handyman and maintenance specialist. From plumbing fixes to electrical work, I handle all your home maintenance needs with professionalism.",
    profileImage: "",
    location: {
      address: "Surulere, Lagos",
      city: "Lagos",
      state: "Lagos",
      coordinates: {
        lat: 6.4969,
        lng: 3.3547
      }
    },
    categories: ["maintenance", "tech"],
    skills: ["Plumbing", "Electrical Work", "Carpentry", "Computer Repair", "TV Installation"],
    languages: ["English", "Yoruba"],
    experience: {
      years: 10,
      description: "Certified electrician and plumber with a decade of experience in residential and commercial maintenance."
    },
    pricing: {
      hourlyRate: 3500,
      minimumHours: 2,
      currency: "NGN"
    },
    availability: {
      workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      workingHours: {
        start: "09:00",
        end: "17:00"
      },
      timezone: "Africa/Lagos"
    },
    verification: {
      isVerified: true,
      idVerified: true,
      backgroundCheck: true,
      verifiedAt: "2023-10-05T11:00:00Z"
    },
    rating: {
      average: 4.7,
      totalReviews: 145
    },
    stats: {
      completedJobs: 198,
      responseTime: 20,
      rehireRate: 82
    },
    preferences: {
      maxRadius: 35,
      acceptsLastMinute: true,
      acceptsWeekends: true
    },
    isActive: true,
    createdAt: "2023-07-10T00:00:00Z",
    updatedAt: "2024-01-19T00:00:00Z"
  },
  {
    id: "worker_5",
    userId: "user_5",
    displayName: "Fatima Hassan",
    bio: "Mathematics and science tutor with a passion for education. I help students excel in their studies with personalized learning approaches.",
    profileImage: "",
    location: {
      address: "Kaduna North, Kaduna",
      city: "Kaduna",
      state: "Kaduna",
      coordinates: {
        lat: 10.5105,
        lng: 7.4165
      }
    },
    categories: ["tutoring"],
    skills: ["Mathematics", "Physics", "Chemistry", "SAT Prep", "Study Planning"],
    languages: ["English", "Hausa", "Arabic"],
    experience: {
      years: 6,
      description: "Mathematics graduate with a Master's in Education. I've helped over 200 students improve their grades and gain admission to top universities."
    },
    pricing: {
      hourlyRate: 2800,
      minimumHours: 1,
      currency: "NGN"
    },
    availability: {
      workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      workingHours: {
        start: "14:00",
        end: "20:00"
      },
      timezone: "Africa/Lagos"
    },
    verification: {
      isVerified: true,
      idVerified: true,
      backgroundCheck: true,
      verifiedAt: "2023-09-30T14:00:00Z"
    },
    rating: {
      average: 4.9,
      totalReviews: 98
    },
    stats: {
      completedJobs: 176,
      responseTime: 12,
      rehireRate: 91
    },
    preferences: {
      maxRadius: 15,
      acceptsLastMinute: false,
      acceptsWeekends: true
    },
    isActive: true,
    createdAt: "2023-08-20T00:00:00Z",
    updatedAt: "2024-01-21T00:00:00Z"
  },
  {
    id: "worker_6",
    userId: "user_6",
    displayName: "Emmanuel Okonkwo",
    bio: "Professional event coordinator and setup specialist. I help make your events memorable with attention to detail and seamless execution.",
    profileImage: "",
    location: {
      address: "Enugu East, Enugu",
      city: "Enugu",
      state: "Enugu",
      coordinates: {
        lat: 6.2649,
        lng: 7.3780
      }
    },
    categories: ["events"],
    skills: ["Event Planning", "Decoration", "Sound System Setup", "Catering Coordination"],
    languages: ["English", "Igbo"],
    experience: {
      years: 7,
      description: "Started as a wedding planner assistant and now coordinate events of all sizes, from intimate gatherings to corporate functions."
    },
    pricing: {
      hourlyRate: 4500,
      minimumHours: 4,
      currency: "NGN"
    },
    availability: {
      workingDays: ["friday", "saturday", "sunday"],
      workingHours: {
        start: "08:00",
        end: "23:00"
      },
      timezone: "Africa/Lagos"
    },
    verification: {
      isVerified: true,
      idVerified: true,
      backgroundCheck: true,
      verifiedAt: "2023-11-15T16:00:00Z"
    },
    rating: {
      average: 4.8,
      totalReviews: 67
    },
    stats: {
      completedJobs: 89,
      responseTime: 30,
      rehireRate: 88
    },
    preferences: {
      maxRadius: 50,
      acceptsLastMinute: false,
      acceptsWeekends: true
    },
    isActive: true,
    createdAt: "2023-09-01T00:00:00Z",
    updatedAt: "2024-01-17T00:00:00Z"
  }
];

export const getWorkersByCategory = (categoryId: string): WorkerProfile[] => {
  return mockWorkers.filter(worker => 
    worker.categories.includes(categoryId)
  );
};

export const getWorkersByLocation = (city: string): WorkerProfile[] => {
  return mockWorkers.filter(worker => 
    worker.location.city.toLowerCase() === city.toLowerCase()
  );
};

export const getTopRatedWorkers = (limit: number = 5): WorkerProfile[] => {
  return [...mockWorkers]
    .sort((a, b) => b.rating.average - a.rating.average)
    .slice(0, limit);
};

export const searchWorkers = (query: string): WorkerProfile[] => {
  const searchTerm = query.toLowerCase();
  return mockWorkers.filter(worker => 
    worker.displayName.toLowerCase().includes(searchTerm) ||
    worker.bio.toLowerCase().includes(searchTerm) ||
    worker.skills.some(skill => skill.toLowerCase().includes(searchTerm)) ||
    worker.categories.some(cat => cat.toLowerCase().includes(searchTerm))
  );
}; 