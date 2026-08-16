import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-4 py-16 text-center">
      <h1 className="page-title">Página não encontrada</h1>
      <p className="mt-3 text-muted">
        Esse endereço não existe. Volte à árvore e escolha uma pessoa.
      </p>
      <Link href="/arvore" className="btn-solid mx-auto mt-8">
        Ir para a árvore
      </Link>
    </main>
  );
}
