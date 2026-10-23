import GitGraph from "@/components/GitGraph";
import { mockColors, mockScenes } from "@/mocks/scenes";

// Gallery of the conflict scenes. Each one plays when it scrolls into view.
export default function ScenesPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Scene gallery</h1>
      <p className="mt-1 text-muted">Conflict scenes 1 to 8, drawn from mock data.</p>

      <ol className="mt-6 divide-y divide-border border-t border-border">
        {mockScenes.map((s, i) => (
          <li key={s.id} className="py-6">
            <h2 className="mb-3 font-semibold">
              <span className="mr-2 font-mono text-subtle">{i + 1}</span>
              {s.title}
            </h2>
            <GitGraph scene={s.scene} colorByPerson={mockColors} />
          </li>
        ))}
      </ol>
    </div>
  );
}
