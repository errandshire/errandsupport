import { Category } from "@/lib/types/marketplace";

export const categories: Category[] = [
  {
    id: "cleaning",
    name: "Cleaning Services",
    slug: "cleaning",
    description: "Professional home and office cleaning services",
    icon: "cleaning",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "delivery",
    name: "Delivery & Logistics",
    slug: "delivery",
    description: "Package delivery, food pickup, and transportation services",
    icon: "truck",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "shopping",
    name: "Shopping & Errands",
    slug: "shopping",
    description: "Grocery shopping, personal shopping, and general errands",
    icon: "shopping-cart",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "maintenance",
    name: "Home Maintenance",
    slug: "maintenance",
    description: "Handyman services, repairs, and home improvements",
    icon: "wrench",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "childcare",
    name: "Child & Elder Care",
    slug: "childcare",
    description: "Babysitting, elderly care, and companion services",
    icon: "heart",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "petcare",
    name: "Pet Care",
    slug: "petcare",
    description: "Pet sitting, dog walking, and pet grooming services",
    icon: "heart",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "gardening",
    name: "Gardening & Landscaping",
    slug: "gardening",
    description: "Lawn care, gardening, and outdoor maintenance",
    icon: "leaf",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tutoring",
    name: "Tutoring & Education",
    slug: "tutoring",
    description: "Academic tutoring, skill training, and educational support",
    icon: "book",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "events",
    name: "Event Support",
    slug: "events",
    description: "Event planning assistance, setup, and coordination",
    icon: "calendar",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tech",
    name: "Tech Support",
    slug: "tech",
    description: "Computer repair, setup, and technical assistance",
    icon: "monitor",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Subcategories for more specific filtering
export const subcategories: Category[] = [
  // Cleaning subcategories
  {
    id: "house-cleaning",
    name: "House Cleaning",
    slug: "house-cleaning",
    description: "Regular home cleaning services",
    icon: "home",
    parentId: "cleaning",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "office-cleaning",
    name: "Office Cleaning",
    slug: "office-cleaning",
    description: "Commercial office cleaning",
    icon: "building",
    parentId: "cleaning",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "deep-cleaning",
    name: "Deep Cleaning",
    slug: "deep-cleaning",
    description: "Thorough deep cleaning services",
    icon: "sparkles",
    parentId: "cleaning",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  
  // Delivery subcategories
  {
    id: "food-delivery",
    name: "Food Delivery",
    slug: "food-delivery",
    description: "Restaurant and food pickup services",
    icon: "utensils",
    parentId: "delivery",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "package-delivery",
    name: "Package Delivery",
    slug: "package-delivery",
    description: "Document and package delivery",
    icon: "package",
    parentId: "delivery",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  
  // Shopping subcategories
  {
    id: "grocery-shopping",
    name: "Grocery Shopping",
    slug: "grocery-shopping",
    description: "Food and household item shopping",
    icon: "shopping-basket",
    parentId: "shopping",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "personal-shopping",
    name: "Personal Shopping",
    slug: "personal-shopping",
    description: "Clothing and personal item shopping",
    icon: "shirt",
    parentId: "shopping",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const getAllCategories = (): Category[] => {
  return [...categories, ...subcategories];
};

export const getMainCategories = (): Category[] => {
  return categories;
};

export const getSubcategories = (parentId: string): Category[] => {
  return subcategories.filter(cat => cat.parentId === parentId);
};

export const getCategoryById = (id: string): Category | undefined => {
  return getAllCategories().find(cat => cat.id === id);
};

export const getCategoryBySlug = (slug: string): Category | undefined => {
  return getAllCategories().find(cat => cat.slug === slug);
}; 