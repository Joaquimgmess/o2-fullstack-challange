import { rootRoute } from "@/main";
import { createRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ProductModal } from "../components/ProductModal";
import {
  listProductsOptions,
  type Product,
  type ProductInput,
  createProductFn,
  updateProductFn,
  deleteProductFn,
} from "@/services/productService";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

export const produtosRoute = createRoute({
  pendingComponent: () => <div>Carregando...</div>,
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
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();

  const createProductMutation = useMutation({
    mutationFn: createProductFn,
    onMutate: async (newProductInput: ProductInput) => {
      await queryClient.cancelQueries({
        queryKey: listProductsOptions.queryKey,
      });
      const previousProducts = queryClient.getQueryData<Product[]>(
        listProductsOptions.queryKey
      );
      const tempId = Date.now();
      const optimisticProduct: Product = { id: tempId, ...newProductInput };

      queryClient.setQueryData<Product[]>(
        listProductsOptions.queryKey,
        (old = []) => [...old, optimisticProduct]
      );
      setModalOpen(false);
      setSelectedProduct(undefined);
      return { previousProducts, optimisticProduct };
    },
    onError: (err, newProduct, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(
          listProductsOptions.queryKey,
          context.previousProducts
        );
      }
      setError(err instanceof Error ? err.message : "Erro ao criar produto");
      if (context?.optimisticProduct) {
        queryClient.setQueryData<Product[]>(
          listProductsOptions.queryKey,
          (old = []) => old.filter((p) => p.id !== context.optimisticProduct.id)
        );
      }
    },
    onSuccess: (data, variables, context) => {
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
    mutationFn: updateProductFn,
    onMutate: async (updatedProductData: {
      id: number;
      product: ProductInput;
    }) => {
      await queryClient.cancelQueries({
        queryKey: listProductsOptions.queryKey,
      });
      const previousProducts = queryClient.getQueryData<Product[]>(
        listProductsOptions.queryKey
      );
      const optimisticUpdatedProduct: Product = {
        id: updatedProductData.id,
        ...updatedProductData.product,
      };

      queryClient.setQueryData<Product[]>(
        listProductsOptions.queryKey,
        (old = []) =>
          old.map((p) =>
            p.id === optimisticUpdatedProduct.id ? optimisticUpdatedProduct : p
          )
      );
      setModalOpen(false);
      setSelectedProduct(undefined);
      return { previousProducts };
    },
    onError: (err, newProduct, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(
          listProductsOptions.queryKey,
          context.previousProducts
        );
      }
      setError(
        err instanceof Error ? err.message : "Erro ao atualizar produto"
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listProductsOptions.queryKey });
    },
  });

  async function handleSave(productData: ProductInput) {
    setError(null);
    try {
      if (selectedProduct) {
        await updateProductMutation.mutateAsync({
          id: selectedProduct.id,
          product: productData,
        });
      } else {
        await createProductMutation.mutateAsync(productData);
      }
    } catch (err) {
      console.error("Falha ao salvar:", err);
    }
  }

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
      return { previousProducts };
    },
    onError: (err, id, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(
          listProductsOptions.queryKey,
          context.previousProducts
        );
      }
      setError(err instanceof Error ? err.message : "Falha ao deletar produto");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listProductsOptions.queryKey });
    },
  });

  async function handleDelete(id: number) {
    setError(null);
    try {
      await deleteProductMutation.mutateAsync(id);
    } catch (err) {
      console.error("Falha ao deletar:", err);
    }
  }

  function handleEdit(product: Product) {
    setSelectedProduct(product);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setSelectedProduct(undefined);
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        {error}
        <button
          className="ml-2 text-blue-500 hover:text-blue-700"
          onClick={() => {
            setError(null);
            queryClient.invalidateQueries({
              queryKey: listProductsOptions.queryKey,
            });
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Lista de Produtos</h1>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          onClick={() => {
            setSelectedProduct(undefined);
            setModalOpen(true);
          }}
        >
          Novo Produto
        </button>
      </div>
      <ProductList onEdit={handleEdit} onDelete={handleDelete} />
      <ProductModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        product={selectedProduct}
      />
    </div>
  );
}

interface ProductListProps {
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

function ProductList({ onEdit, onDelete }: ProductListProps) {
  const {
    data: products,
    isLoading,
    error: queryError,
  } = useQuery(listProductsOptions);

  if (isLoading) return <div>Carregando produtos...</div>;
  if (queryError)
    return (
      <div className="text-red-500">
        Erro ao carregar produtos: {queryError.message}
      </div>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products?.map((product) => (
        <div key={product.id} className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold">{product.name}</h2>
          <p className="text-gray-600">{product.description}</p>
          <div className="mt-2 flex justify-between items-center">
            <span className="text-green-600 font-medium">
              R$ {product.price.toFixed(2)}
            </span>
            <span className="text-gray-500">Estoque: {product.quantity}</span>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button
              className="text-blue-500 hover:text-blue-700"
              onClick={() => onEdit(product)}
            >
              Editar
            </button>
            <button
              className="text-red-500 hover:text-red-700"
              onClick={() => onDelete(product.id)}
            >
              Excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
