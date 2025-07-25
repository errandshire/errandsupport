"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Upload, 
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Calendar,
  FileImage,
  FileVideo,
  File
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WorkerSidebar, SidebarToggle } from "@/components/layout/worker-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  type: string;
  category: "certificate" | "portfolio" | "contract" | "invoice" | "other";
  size: string;
  uploadDate: string;
  status: "verified" | "pending" | "rejected";
  description?: string;
  expiryDate?: string;
  url?: string;
}

const mockDocuments: Document[] = [
  {
    id: "1",
    name: "Plumbing License Certificate",
    type: "pdf",
    category: "certificate",
    size: "2.4 MB",
    uploadDate: "2024-01-15",
    status: "verified",
    description: "Professional plumbing license",
    expiryDate: "2025-01-15"
  },
  {
    id: "2",
    name: "Portfolio - Kitchen Renovation",
    type: "jpg",
    category: "portfolio",
    size: "5.2 MB",
    uploadDate: "2024-01-10",
    status: "verified",
    description: "Before and after photos of kitchen renovation project"
  },
  {
    id: "3",
    name: "Service Contract Template",
    type: "docx",
    category: "contract",
    size: "156 KB",
    uploadDate: "2024-01-08",
    status: "pending",
    description: "Standard service agreement template"
  },
  {
    id: "4",
    name: "Insurance Certificate",
    type: "pdf",
    category: "certificate",
    size: "1.8 MB",
    uploadDate: "2024-01-05",
    status: "verified",
    description: "Public liability insurance certificate",
    expiryDate: "2024-12-31"
  },
  {
    id: "5",
    name: "January Invoice - Sarah Johnson",
    type: "pdf",
    category: "invoice",
    size: "234 KB",
    uploadDate: "2024-01-20",
    status: "verified",
    description: "Service invoice for house cleaning"
  }
];

export default function WorkerDocumentsPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [documents, setDocuments] = React.useState<Document[]>(mockDocuments);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);

  React.useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/worker/documents");
      return;
    }
    
    if (user.role !== "worker") {
      router.replace(`/${user.role}`);
      return;
    }
  }, [loading, isAuthenticated, user, router]);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "rejected":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <FileImage className="h-5 w-5" />;
      case "mp4":
      case "avi":
      case "mov":
        return <FileVideo className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case "certificate":
        return "Certificate";
      case "portfolio":
        return "Portfolio";
      case "contract":
        return "Contract";
      case "invoice":
        return "Invoice";
      default:
        return "Other";
    }
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(documents.filter(doc => doc.id !== id));
  };

  const handleUpload = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploadOpen(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const documentCounts = {
    all: documents.length,
    certificate: documents.filter(d => d.category === "certificate").length,
    portfolio: documents.filter(d => d.category === "portfolio").length,
    contract: documents.filter(d => d.category === "contract").length,
    invoice: documents.filter(d => d.category === "invoice").length,
    other: documents.filter(d => d.category === "other").length,
  };

  const statusCounts = {
    all: documents.length,
    verified: documents.filter(d => d.status === "verified").length,
    pending: documents.filter(d => d.status === "pending").length,
    rejected: documents.filter(d => d.status === "rejected").length,
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
     

      <div className="flex-1 flex flex-col lg:ml-0">
       
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
                  Documents
                </h1>
                <p className="text-neutral-600">
                  Manage your certificates, portfolio, and business documents
                </p>
              </div>
              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                      Add a new document to your profile
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="document-name">Document Name</Label>
                      <Input id="document-name" placeholder="Enter document name" />
                    </div>
                    <div>
                      <Label htmlFor="document-category">Category</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="certificate">Certificate</SelectItem>
                          <SelectItem value="portfolio">Portfolio</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="invoice">Invoice</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="document-description">Description (Optional)</Label>
                      <Input id="document-description" placeholder="Brief description" />
                    </div>
                    <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6">
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-neutral-400" />
                        <div className="mt-4">
                          <Button variant="outline" onClick={handleUpload}>
                            Choose File
                          </Button>
                        </div>
                        <p className="text-sm text-neutral-500 mt-2">
                          PDF, DOC, JPG, PNG up to 10MB
                        </p>
                      </div>
                    </div>
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} />
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories ({documentCounts.all})</SelectItem>
                  <SelectItem value="certificate">Certificates ({documentCounts.certificate})</SelectItem>
                  <SelectItem value="portfolio">Portfolio ({documentCounts.portfolio})</SelectItem>
                  <SelectItem value="contract">Contracts ({documentCounts.contract})</SelectItem>
                  <SelectItem value="invoice">Invoices ({documentCounts.invoice})</SelectItem>
                  <SelectItem value="other">Other ({documentCounts.other})</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status ({statusCounts.all})</SelectItem>
                  <SelectItem value="verified">Verified ({statusCounts.verified})</SelectItem>
                  <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
                  <SelectItem value="rejected">Rejected ({statusCounts.rejected})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All Documents</TabsTrigger>
                <TabsTrigger value="certificates">Certificates</TabsTrigger>
                <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                <TabsTrigger value="business">Business Docs</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <div className="grid gap-4">
                  {filteredDocuments.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-12">
                        <FileText className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-neutral-900 mb-2">
                          No documents found
                        </h3>
                        <p className="text-neutral-600 mb-4">
                          {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                            ? "Try adjusting your search or filters"
                            : "Upload your first document to get started"}
                        </p>
                        <Button onClick={() => setIsUploadOpen(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Upload Document
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <Card key={doc.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4">
                              <div className="p-2 bg-neutral-100 rounded-lg">
                                {getFileIcon(doc.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h3 className="font-medium text-neutral-900 truncate">
                                    {doc.name}
                                  </h3>
                                  <Badge className={getStatusColor(doc.status)}>
                                    <div className="flex items-center space-x-1">
                                      {getStatusIcon(doc.status)}
                                      <span>{doc.status}</span>
                                    </div>
                                  </Badge>
                                  <Badge variant="outline">
                                    {getCategoryName(doc.category)}
                                  </Badge>
                                </div>
                                {doc.description && (
                                  <p className="text-sm text-neutral-600 mb-2">
                                    {doc.description}
                                  </p>
                                )}
                                <div className="flex items-center space-x-4 text-sm text-neutral-500">
                                  <span>{doc.size}</span>
                                  <span>•</span>
                                  <span>
                                    Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
                                  </span>
                                  {doc.expiryDate && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center space-x-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>
                                          Expires {new Date(doc.expiryDate).toLocaleDateString()}
                                        </span>
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteDocument(doc.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="certificates" className="mt-6">
                <div className="grid gap-4">
                  {filteredDocuments.filter(doc => doc.category === "certificate").map((doc) => (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              {getFileIcon(doc.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-medium text-neutral-900 truncate">
                                  {doc.name}
                                </h3>
                                <Badge className={getStatusColor(doc.status)}>
                                  <div className="flex items-center space-x-1">
                                    {getStatusIcon(doc.status)}
                                    <span>{doc.status}</span>
                                  </div>
                                </Badge>
                              </div>
                              {doc.description && (
                                <p className="text-sm text-neutral-600 mb-2">
                                  {doc.description}
                                </p>
                              )}
                              <div className="flex items-center space-x-4 text-sm text-neutral-500">
                                <span>{doc.size}</span>
                                <span>•</span>
                                <span>
                                  Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
                                </span>
                                {doc.expiryDate && (
                                  <>
                                    <span>•</span>
                                    <span className={cn(
                                      "flex items-center space-x-1",
                                      new Date(doc.expiryDate) < new Date() ? "text-red-600" : "text-neutral-500"
                                    )}>
                                      <Calendar className="h-3 w-3" />
                                      <span>
                                        Expires {new Date(doc.expiryDate).toLocaleDateString()}
                                      </span>
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="portfolio" className="mt-6">
                <div className="grid gap-4">
                  {filteredDocuments.filter(doc => doc.category === "portfolio").map((doc) => (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="p-2 bg-green-100 rounded-lg">
                              {getFileIcon(doc.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-medium text-neutral-900 truncate">
                                  {doc.name}
                                </h3>
                                <Badge className={getStatusColor(doc.status)}>
                                  <div className="flex items-center space-x-1">
                                    {getStatusIcon(doc.status)}
                                    <span>{doc.status}</span>
                                  </div>
                                </Badge>
                              </div>
                              {doc.description && (
                                <p className="text-sm text-neutral-600 mb-2">
                                  {doc.description}
                                </p>
                              )}
                              <div className="flex items-center space-x-4 text-sm text-neutral-500">
                                <span>{doc.size}</span>
                                <span>•</span>
                                <span>
                                  Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="business" className="mt-6">
                <div className="grid gap-4">
                  {filteredDocuments.filter(doc => ["contract", "invoice", "other"].includes(doc.category)).map((doc) => (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              {getFileIcon(doc.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-medium text-neutral-900 truncate">
                                  {doc.name}
                                </h3>
                                <Badge className={getStatusColor(doc.status)}>
                                  <div className="flex items-center space-x-1">
                                    {getStatusIcon(doc.status)}
                                    <span>{doc.status}</span>
                                  </div>
                                </Badge>
                                <Badge variant="outline">
                                  {getCategoryName(doc.category)}
                                </Badge>
                              </div>
                              {doc.description && (
                                <p className="text-sm text-neutral-600 mb-2">
                                  {doc.description}
                                </p>
                              )}
                              <div className="flex items-center space-x-4 text-sm text-neutral-500">
                                <span>{doc.size}</span>
                                <span>•</span>
                                <span>
                                  Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        
      </div>
    </div>
  );
} 