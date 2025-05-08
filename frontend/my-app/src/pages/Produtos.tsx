import { rootRoute } from "@/main";
import { createRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  listProductsOptions,
  type Product,
  createProductFn,
  updateProductFn,
  deleteProductFn,
} from "@/services/productService";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ProductFormInput {
  name: string;
  description: string;
  category: string;
  price: number;
  quantity: number;
}

export const produtosRoute = createRoute({
  pendingComponent: () => <div className="p-4">Carregando...</div>,
  getParentRoute: () => rootRoute,
  path: "/produtos",
  component: Produtos,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(listProductsOptions);
    return {};
  },
});

function Produtos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();

  const [currentProductForm, setCurrentProductForm] = useState<
    ProductFormInput & { id?: number }
  >({
    id: undefined,
    name: "",
    description: "",
    category: "",
    price: 0,
    quantity: 0,
  });

  const { data: productsData, isLoading: isLoadingProducts } =
    useQuery(listProductsOptions);

  const products = productsData || [];

  const createProductMutation = useMutation({
    mutationFn: (newProductData: ProductFormInput) =>
      createProductFn(newProductData),
    onMutate: async (newProductInput: ProductFormInput) => {
      await queryClient.cancelQueries({
        queryKey: listProductsOptions.queryKey,
      });
      const previousProducts = queryClient.getQueryData<Product[]>(
        listProductsOptions.queryKey
      );
      const tempId = Date.now();
      const optimisticProduct: Product = {
        id: tempId,
        name: newProductInput.name,
        description: newProductInput.description,
        price: newProductInput.price,
        quantity: newProductInput.quantity,
        category: newProductInput.category,
      };

      queryClient.setQueryData<Product[]>(
        listProductsOptions.queryKey,
        (old = []) => [...old, optimisticProduct]
      );
      setIsDialogOpen(false);
      return { previousProducts, optimisticProduct };
    },
    onError: (err, _newProduct, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(
          listProductsOptions.queryKey,
          context.previousProducts
        );
      }
      toast.error(err instanceof Error ? err.message : "Erro ao criar produto");
      if (context?.optimisticProduct) {
        queryClient.setQueryData<Product[]>(
          listProductsOptions.queryKey,
          (old = []) => old.filter((p) => p.id !== context.optimisticProduct.id)
        );
      }
    },
    onSuccess: (data, _variables, context) => {
      toast.success("Produto cadastrado com sucesso!");
      queryClient.setQueryData<Product[]>(
        listProductsOptions.queryKey,
        (old = []) =>
          old.map((p) => (p.id === context?.optimisticProduct.id ? data : p))
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listProductsOptions.queryKey });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: (data: { id: number; product: ProductFormInput }) =>
      updateProductFn({ id: data.id, product: data.product }),
    onMutate: async (updatedProductData: {
      id: number;
      product: ProductFormInput;
    }) => {
      await queryClient.cancelQueries({
        queryKey: listProductsOptions.queryKey,
      });
      const previousProducts = queryClient.getQueryData<Product[]>(
        listProductsOptions.queryKey
      );
      const optimisticUpdatedProduct: Product = {
        id: updatedProductData.id,
        name: updatedProductData.product.name,
        description: updatedProductData.product.description,
        price: updatedProductData.product.price,
        quantity: updatedProductData.product.quantity,
        category: updatedProductData.product.category,
      };

      queryClient.setQueryData<Product[]>(
        listProductsOptions.queryKey,
        (old = []) =>
          old.map((p) =>
            p.id === optimisticUpdatedProduct.id ? optimisticUpdatedProduct : p
          )
      );
      setIsDialogOpen(false);
      return { previousProducts };
    },
    onError: (err, _newProduct, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(
          listProductsOptions.queryKey,
          context.previousProducts
        );
      }
      toast.error(
        err instanceof Error ? err.message : "Erro ao atualizar produto"
      );
    },
    onSuccess: () => {
      toast.success("Produto atualizado com sucesso!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listProductsOptions.queryKey });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: deleteProductFn,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({
        queryKey: listProductsOptions.queryKey,
      });
      const previousProducts = queryClient.getQueryData<Product[]>(
        listProductsOptions.queryKey
      );
      queryClient.setQueryData<Product[]>(
        listProductsOptions.queryKey,
        (old = []) => old.filter((p) => p.id !== id)
      );
      setIsDeleteDialogOpen(false);
      return { previousProducts, deletedId: id };
    },
    onError: (err, _id, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(
          listProductsOptions.queryKey,
          context.previousProducts
        );
      }
      toast.error(
        err instanceof Error ? err.message : "Falha ao deletar produto"
      );
    },
    onSuccess: () => {
      toast.success("Produto removido com sucesso!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listProductsOptions.queryKey });
    },
  });

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.category &&
        product.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCreateProduct = () => {
    setSelectedProduct(undefined);
    setCurrentProductForm({
      id: undefined,
      name: "",
      description: "",
      category: "",
      price: 0,
      quantity: 0,
    });
    setIsDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentProductForm({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category || "",
      price: product.price,
      quantity: product.quantity,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedProduct) {
      deleteProductMutation.mutate(selectedProduct.id);
    }
  };

  const handleSaveProduct = () => {
    if (currentProductForm.name.trim() === "") {
      toast.error("O nome do produto é obrigatório");
      return;
    }
    if (currentProductForm.category.trim() === "") {
      toast.error("A categoria do produto é obrigatória");
      return;
    }
    if (currentProductForm.price <= 0) {
      toast.error("O preço deve ser maior que zero");
      return;
    }
    if (currentProductForm.quantity < 0) {
      toast.error("A quantidade não pode ser negativa");
      return;
    }

    const productDataToSave: ProductFormInput = {
      name: currentProductForm.name,
      description: currentProductForm.description,
      category: currentProductForm.category,
      price: currentProductForm.price,
      quantity: currentProductForm.quantity,
    };

    if (currentProductForm.id) {
      updateProductMutation.mutate({
        id: currentProductForm.id,
        product: productDataToSave,
      });
    } else {
      createProductMutation.mutate(productDataToSave);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCurrentProductForm({
      ...currentProductForm,
      [name]:
        name === "price" || name === "quantity"
          ? parseFloat(value) || 0
          : value,
    });
  };

  const handleSelectChange = (value: string) => {
    setCurrentProductForm({
      ...currentProductForm,
      category: value,
    });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {" "}
      {/* Adicionado padding responsivo */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Gerenciamento de Produtos</h1>
        <Button onClick={handleCreateProduct}>
          <Plus className="mr-2 h-4 w-4" /> Novo Produto
        </Button>
      </div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produtos por nome ou categoria..."
          value={searchTerm}
          onChange={handleSearch}
          className="pl-10 w-full sm:w-auto" // Ajustado para melhor responsividade
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Nome</TableHead>{" "}
              {/* Ajuste de largura */}
              <TableHead>Categoria</TableHead>
              <TableHead className="hidden md:table-cell">Preço</TableHead>{" "}
              {/* Ocultar em telas pequenas */}
              <TableHead className="hidden md:table-cell">
                Estoque
              </TableHead>{" "}
              {/* Ocultar em telas pequenas */}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingProducts &&
              products.length > 0 && ( // Indicador de carregamento sutil se já houver dados
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-4 text-muted-foreground"
                  >
                    Atualizando lista...
                  </TableCell>
                </TableRow>
              )}
            {!isLoadingProducts && filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-muted-foreground"
                >
                  {searchTerm
                    ? "Nenhum produto encontrado para sua busca."
                    : "Nenhum produto cadastrado."}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground truncate max-w-xs xl:max-w-md">
                      {" "}
                      {/* Aumentado max-w */}
                      {product.description || "Sem descrição"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.category || "N/A"}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {product.price.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {product.quantity} unid.
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditProduct(product)}
                      title="Editar Produto"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleDeleteClick(product)}
                      title="Excluir Produto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {/* Dialog para criar/editar produto */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedProduct(undefined); // Limpa ao fechar
        }}
      >
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {currentProductForm.id ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações do produto abaixo. Campos com * são
              obrigatórios.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Smartphone X Pro"
                value={currentProductForm.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Ex: Tela AMOLED de 6.7'', 256GB de armazenamento..."
                value={currentProductForm.description}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={currentProductForm.category}
                  onValueChange={handleSelectChange}
                  name="category"
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* {categorias.map((categoria) => (
                      <SelectItem key={categoria} value={categoria}>
                        {categoria}
                      </SelectItem>))} */}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Preço (R$) *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0,00"
                  value={currentProductForm.price}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantidade em Estoque *</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                placeholder="0"
                value={currentProductForm.quantity}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveProduct}
              disabled={
                createProductMutation.isPending ||
                updateProductMutation.isPending
              }
            >
              {createProductMutation.isPending ||
              updateProductMutation.isPending
                ? "Salvando..."
                : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog para confirmar exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o produto "{selectedProduct?.name}
              "? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteProductMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteProductMutation.isPending}
            >
              {deleteProductMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Produtos;
