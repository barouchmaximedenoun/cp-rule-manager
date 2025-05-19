import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
// shadcn/ui imports (replace with actual imports after shadcn add)
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

const PAGE_SIZE = 20;
const API_URL = "http://localhost:4000";

function RuleTable() {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const queryClient = useQueryClient();

  // Fetch rules for current page
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["rules", page],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/rules?page=${page}&pageSize=${PAGE_SIZE}`);
      // Append the "last row" at the end
      const lastRow = await axios.get(`${API_URL}/rules/last`);
      return [...res.data, lastRow.data];
    },
    keepPreviousData: true,
  });

  // Fetch total count for pagination
  const { data: countData } = useQuery({
    queryKey: ["rules-count"],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/rules/count`);
      return res.data.count;
    },
  });

  // Mutations for add/edit/delete/reorder
  const addRule = useMutation({
    mutationFn: (rule) => axios.post(`${API_URL}/rules`, rule),
    onSuccess: () => queryClient.invalidateQueries(["rules", page]),
  });

  const updateRule = useMutation({
    mutationFn: ({ id, ...rule }) => axios.put(`${API_URL}/rules/${id}`, rule),
    onSuccess: () => queryClient.invalidateQueries(["rules", page]),
  });

  const deleteRule = useMutation({
    mutationFn: (id) => axios.delete(`${API_URL}/rules/${id}`),
    onSuccess: () => queryClient.invalidateQueries(["rules", page]),
  });

  const reorderRule = useMutation({
    mutationFn: ({ id, newPriority }) =>
      axios.patch(`${API_URL}/rules/reorder`, { id, newPriority }),
    onSuccess: () => queryClient.invalidateQueries(["rules", page]),
  });

  // Drag-and-drop logic
  const [activeId, setActiveId] = useState(null);

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // Find the new priority (float between over and its neighbors)
    const activeIdx = rules.findIndex((r) => r.id === active.id);
    const overIdx = rules.findIndex((r) => r.id === over.id);
    if (activeIdx === -1 || overIdx === -1) return;
    // Only allow drag if not the last row
    if (rules[activeIdx].isLast || rules[overIdx].isLast) return;
    // Compute new priority
    let newPriority;
    if (overIdx === 0) {
      newPriority = rules[0].priority - 1;
    } else if (overIdx === rules.length - 2) {
      // Just before last row
      newPriority = (rules[rules.length - 2].priority + Number.MAX_SAFE_INTEGER) / 2;
    } else {
      const prev = rules[overIdx - 1].priority;
      const next = rules[overIdx].priority;
      newPriority = (prev + next) / 2;
    }
    reorderRule.mutate({ id: active.id, newPriority });
  }

  // Dialog form state
  const [form, setForm] = useState({
    name: "",
    priority: 0,
    sources: [{ name: "", email: "" }],
    destinations: [{ name: "", email: "" }],
  });

  function openAddDialog() {
    setEditRule(null);
    setForm({
      name: "",
      priority: 0,
      sources: [{ name: "", email: "" }],
      destinations: [{ name: "", email: "" }],
    });
    setDialogOpen(true);
  }

  function openEditDialog(rule) {
    setEditRule(rule);
    setForm({
      name: rule.name,
      priority: rule.displayPriority,
      sources: rule.sources,
      destinations: rule.destinations,
    });
    setDialogOpen(true);
  }

  function handleFormChange(e, idx, type) {
    if (type === "sources" || type === "destinations") {
      const arr = [...form[type]];
      arr[idx][e.target.name] = e.target.value;
      setForm({ ...form, [type]: arr });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  }

  function addSource() {
    setForm({ ...form, sources: [...form.sources, { name: "", email: "" }] });
  }
  function addDestination() {
    setForm({ ...form, destinations: [...form.destinations, { name: "", email: "" }] });
  }

  function handleSave() {
    // For add: compute float priority between last and previous
    if (!editRule) {
      // Only allow add before last row
      const lastIdx = rules.length - 1;
      const prevPriority = lastIdx > 0 ? rules[lastIdx - 1].priority : 0;
      const newPriority = (prevPriority + Number.MAX_SAFE_INTEGER) / 2;
      addRule.mutate({
        ...form,
        priority: newPriority,
      });
    } else {
      updateRule.mutate({
        id: editRule.id,
        ...form,
        priority: editRule.priority, // keep backend float priority
      });
    }
    setDialogOpen(false);
  }

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold">Rules Table</h1>
        <Button onClick={openAddDialog}>Add Rule</Button>
      </div>
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={(e) => setActiveId(e.active.id)}
      >
        <SortableContext
          items={rules.map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Sources</TableHead>
                <TableHead>Destinations</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule, idx) => (
                <SortableRow
                  key={rule.id}
                  rule={rule}
                  idx={idx}
                  onEdit={openEditDialog}
                  onDelete={() => deleteRule.mutate(rule.id)}
                  isLast={rule.isLast}
                  activeId={activeId}
                />
              ))}
            </TableBody>
          </Table>
        </SortableContext>
      </DndContext>
      <div className="flex justify-end gap-2 mt-2">
        <Button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </Button>
        <span>
          Page {page} / {Math.ceil((countData || 1) / PAGE_SIZE)}
        </span>
        <Button
          disabled={page === Math.ceil((countData || 1) / PAGE_SIZE)}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white">
          <DialogTitle>{editRule ? "Edit Rule" : "Add Rule"}</DialogTitle>
          <div className="flex flex-col gap-2">
            <Input
              name="name"
              placeholder="Name"
              value={form.name}
              onChange={handleFormChange}
            />
            {/* Sources */}
            <div>
              <div className="font-semibold">Sources</div>
              {form.sources.map((src, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <Input
                    name="name"
                    placeholder="Source Name"
                    value={src.name}
                    onChange={(e) => handleFormChange(e, i, "sources")}
                  />
                  <Input
                    name="email"
                    placeholder="Source Email"
                    value={src.email}
                    onChange={(e) => handleFormChange(e, i, "sources")}
                  />
                </div>
              ))}
              <Button variant="outline" onClick={addSource}>Add Source</Button>
            </div>
            {/* Destinations */}
            <div>
              <div className="font-semibold">Destinations</div>
              {form.destinations.map((dst, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <Input
                    name="name"
                    placeholder="Destination Name"
                    value={dst.name}
                    onChange={(e) => handleFormChange(e, i, "destinations")}
                  />
                  <Input
                    name="email"
                    placeholder="Destination Email"
                    value={dst.email}
                    onChange={(e) => handleFormChange(e, i, "destinations")}
                  />
                </div>
              ))}
              <Button variant="outline" onClick={addDestination}>Add Destination</Button>
            </div>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sortable row using dnd-kit
function SortableRow({ rule, idx, onEdit, onDelete, isLast, activeId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.id,
    disabled: isLast,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? "#f0f0f0" : undefined,
  };
  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={isLast ? "bg-gray-100 text-gray-400" : ""}
    >
        <TableCell {...listeners}>
            <GripVertical className="cursor-move" />
        </TableCell>
      <TableCell>{rule.displayPriority}</TableCell>
      <TableCell>{rule.name}</TableCell>
      <TableCell>
        {rule.sources.map((s, i) => (
          <div key={i}>{s.name} ({s.email})</div>
        ))}
      </TableCell>
      <TableCell>
        {rule.destinations.map((d, i) => (
          <div key={i}>{d.name} ({d.email})</div>
        ))}
      </TableCell>
      <TableCell>
        {!isLast && (
          <>
            <Button variant="outline" size="sm" onClick={(e) => {
                e.stopPropagation(); 
                console.log("Edit clicked", rule);
                onEdit(rule)}
            }>
              Edit
            </Button>
            <Button variant="destructive" className="bg-red-600 text-white ml-1" size="sm" onClick={onDelete}>
              Delete
            </Button>
          </>
        )}
      </TableCell>
    </TableRow>
  );
}

export default RuleTable;
