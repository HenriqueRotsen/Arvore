"use client";

import type { Person } from "@prisma/client";
import { useState } from "react";
import { PersonChip } from "@/components/PersonChip";
import { PersonSearchSelect } from "@/components/PersonSearchSelect";
import { dateInputValue, fullName, partnershipLabel } from "@/lib/person";
import type { SpouseRelative } from "@/lib/relationships";
import {
  addParentChild,
  addPartnership,
  removeParentChild,
  removePartnership,
} from "@/lib/actions/relations";

type Option = Pick<Person, "id" | "firstName" | "lastName">;

function ActionForm({
  action,
  children,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  children: React.ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-2"
      action={async (formData) => {
        setError(null);
        const result = await action(formData);
        if (result && "error" in result && result.error) {
          setError(result.error);
        }
      }}
    >
      {children}
      {error ? <p className="text-sm text-terracotta">{error}</p> : null}
    </form>
  );
}

export function RelationBlocks({
  person,
  parents,
  childPeople,
  spouses,
  candidates,
  otherParentByChildId,
}: {
  person: Person;
  parents: Person[];
  childPeople: Person[];
  spouses: SpouseRelative[];
  candidates: Option[];
  otherParentByChildId: Record<string, Person | null>;
}) {
  const otherPeople = candidates.filter((item) => item.id !== person.id);
  const parentIds = new Set(parents.map((item) => item.id));
  const childIds = new Set(childPeople.map((item) => item.id));
  const spousePeople = spouses.map((union) => union.person);
  const spouseIds = new Set(spousePeople.map((item) => item.id));

  const parentCandidates = otherPeople.filter((item) => !parentIds.has(item.id));
  const childCandidates = otherPeople.filter((item) => !childIds.has(item.id));
  const spouseCandidates = otherPeople.filter((item) => !spouseIds.has(item.id));

  const childrenByUnion = new Map<string, Person[]>();
  const soloChildren: Person[] = [];
  for (const child of childPeople) {
    const other = otherParentByChildId[child.id];
    if (!other) {
      soloChildren.push(child);
      continue;
    }
    const list = childrenByUnion.get(other.id) ?? [];
    list.push(child);
    childrenByUnion.set(other.id, list);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section>
        <h2 className="font-serif text-xl font-normal italic">Pais</h2>
        <p className="mb-3 text-sm text-muted">Até dois. Vínculo pai/mãe → esta pessoa.</p>
        <ul className="mb-3 space-y-2">
          {parents.length === 0 ? (
            <li className="text-sm text-muted">Nenhum pai cadastrado.</li>
          ) : (
            parents.map((parent) => (
              <li key={parent.id} className="flex flex-wrap items-center justify-between gap-2">
                <PersonChip person={parent} href={`/pessoas/${parent.id}`} />
                <form action={removeParentChild}>
                  <input type="hidden" name="parentId" value={parent.id} />
                  <input type="hidden" name="childId" value={person.id} />
                  <button type="submit" className="btn-danger btn-sm">
                    Remover
                  </button>
                </form>
              </li>
            ))
          )}
        </ul>
        {parents.length < 2 && parentCandidates.length > 0 ? (
          <ActionForm action={addParentChild}>
            <input type="hidden" name="childId" value={person.id} />
            <PersonSearchSelect
              name="parentId"
              people={parentCandidates}
              placeholder="Buscar pai ou mãe"
            />
            <button type="submit" className="btn-solid w-full sm:w-auto">
              Vincular pai/mãe
            </button>
          </ActionForm>
        ) : null}
      </section>

      <section>
        <h2 className="font-serif text-xl font-normal italic">Filhos por união</h2>
        <p className="mb-3 text-sm text-muted">
          Cada casamento pode ter seus próprios filhos. Escolha o outro
          progenitor para ligar o filho a essa união.
        </p>
        {spouses.map((union) => (
          <div key={union.person.id} className="mb-4 border-b border-line pb-4">
            <p className="mb-2 text-sm font-medium">
              Com {fullName(union.person)}
            </p>
            <ul className="mb-2 space-y-2">
              {(childrenByUnion.get(union.person.id) ?? []).length === 0 ? (
                <li className="text-sm text-muted">Nenhum filho nesta união.</li>
              ) : (
                (childrenByUnion.get(union.person.id) ?? []).map((child) => (
                  <li key={child.id} className="flex flex-wrap items-center justify-between gap-2">
                    <PersonChip person={child} href={`/pessoas/${child.id}`} />
                    <form action={removeParentChild}>
                      <input type="hidden" name="parentId" value={person.id} />
                      <input type="hidden" name="childId" value={child.id} />
                      <button type="submit" className="btn-danger btn-sm">
                        Remover
                      </button>
                    </form>
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
        {soloChildren.length > 0 ? (
          <div className="mb-4 border-b border-line pb-4">
            <p className="mb-2 text-sm font-medium">Só com este progenitor</p>
            <ul className="space-y-2">
              {soloChildren.map((child) => (
                <li key={child.id} className="flex flex-wrap items-center justify-between gap-2">
                  <PersonChip person={child} href={`/pessoas/${child.id}`} />
                  <form action={removeParentChild}>
                    <input type="hidden" name="parentId" value={person.id} />
                    <input type="hidden" name="childId" value={child.id} />
                    <button type="submit" className="btn-danger btn-sm">
                      Remover
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {childCandidates.length > 0 ? (
          <ActionForm action={addParentChild}>
            <input type="hidden" name="parentId" value={person.id} />
            <PersonSearchSelect
              name="childId"
              people={childCandidates}
              placeholder="Buscar filho ou filha"
            />
            <PersonSearchSelect
              name="otherParentId"
              people={spousePeople}
              placeholder="Deste casamento com… (opcional)"
              required={false}
            />
            <button type="submit" className="btn-solid w-full sm:w-auto">
              Vincular filho
            </button>
          </ActionForm>
        ) : null}
      </section>

      <section>
        <h2 className="font-serif text-xl font-normal italic">Casamentos e uniões</h2>
        <p className="mb-3 text-sm text-muted">
          Uma pessoa pode ter vários casamentos. Cada união pode gerar filhos
          diferentes.
        </p>
        <ul className="mb-3 space-y-2">
          {spouses.length === 0 ? (
            <li className="text-sm text-muted">Nenhum casamento cadastrado.</li>
          ) : (
            spouses.map((union, index) => (
              <li key={union.person.id} className="space-y-2 border-b border-line pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="mr-2 text-xs text-muted">#{index + 1}</span>
                    <PersonChip person={union.person} href={`/pessoas/${union.person.id}`} />
                    <span className="mt-1 block text-sm text-muted">
                      {partnershipLabel(union)}
                    </span>
                  </span>
                  <form action={removePartnership}>
                    <input type="hidden" name="personAId" value={person.id} />
                    <input type="hidden" name="personBId" value={union.person.id} />
                    <button type="submit" className="btn-danger btn-sm">
                      Remover
                    </button>
                  </form>
                </div>
                <ActionForm action={addPartnership}>
                  <input type="hidden" name="personAId" value={person.id} />
                  <input type="hidden" name="personBId" value={union.person.id} />
                  <input type="hidden" name="type" value={union.type} />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-muted">
                      Início
                      <input
                        type="date"
                        name="startDate"
                        defaultValue={dateInputValue(union.startDate)}
                        className="input-line mt-1"
                      />
                    </label>
                    <label className="text-xs text-muted">
                      Término (se houver)
                      <input
                        type="date"
                        name="endDate"
                        defaultValue={dateInputValue(union.endDate)}
                        className="input-line mt-1"
                      />
                    </label>
                  </div>
                  <button type="submit" className="btn-outline btn-sm">
                    Salvar datas
                  </button>
                </ActionForm>
              </li>
            ))
          )}
        </ul>
        {spouseCandidates.length > 0 ? (
          <ActionForm action={addPartnership}>
            <input type="hidden" name="personAId" value={person.id} />
            <PersonSearchSelect
              name="personBId"
              people={spouseCandidates}
              placeholder="Buscar cônjuge"
            />
            <select
              name="type"
              defaultValue="married"
              className="input-line"
            >
              <option value="married">Casamento</option>
              <option value="partner">União / parceiro</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted">
                Início
                <input
                  type="date"
                  name="startDate"
                  className="input-line mt-1"
                />
              </label>
              <label className="text-xs text-muted">
                Término (se houver)
                <input
                  type="date"
                  name="endDate"
                  className="input-line mt-1"
                />
              </label>
            </div>
            <button type="submit" className="btn-solid w-full sm:w-auto">
              Adicionar casamento
            </button>
          </ActionForm>
        ) : null}
      </section>
    </div>
  );
}
