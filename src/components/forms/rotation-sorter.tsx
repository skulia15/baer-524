'use client'

import type { Household } from '@/types/db'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

interface RotationSorterProps {
  households: Household[]
  order: string[]
  onChange: (order: string[]) => void
}

function SortableItem({ household, index }: { household: Household; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: household.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-3 shadow-sm"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab text-stone-300 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </span>
      <span
        className="h-4 w-4 flex-shrink-0 rounded-full"
        style={{ backgroundColor: household.color }}
      />
      <span className="text-sm font-medium text-stone-800">
        {index + 1}. {household.name}
      </span>
    </div>
  )
}

export function RotationSorter({ households, order, onChange }: RotationSorterProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const orderedHouseholds = order
    .map((id) => households.find((h) => h.id === id))
    .filter((h): h is Household => !!h)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = order.indexOf(active.id as string)
      const newIndex = order.indexOf(over.id as string)
      onChange(arrayMove(order, oldIndex, newIndex))
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {orderedHouseholds.map((household, index) => (
            <SortableItem key={household.id} household={household} index={index} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
