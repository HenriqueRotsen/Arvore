import { PersonForm } from "@/components/PersonForm";
import { createPerson } from "@/lib/actions/people";

export default function NewPersonPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="page-title">Nova pessoa</h1>
      <p className="mt-2 mb-8 text-muted">
        Pode cadastrar sem vínculo: a pessoa entra na árvore como um nó solto.
        Depois, nesta ficha, você liga pai, filho ou cônjuge — e as árvores se
        juntam.
      </p>
      <PersonForm action={createPerson} submitLabel="Cadastrar pessoa" />
    </main>
  );
}
